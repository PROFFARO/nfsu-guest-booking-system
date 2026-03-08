import Room from "../models/Room.js";
import Booking from "../models/Booking.js";
import Review from "../models/Review.js";

// Tool Definitions (OpenAI Specification)
const tools = [
  {
    type: "function",
    function: {
      name: "get_available_rooms",
      description: "Get a list of available rooms based on type and dates",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["single", "double"], description: "Room type" },
          floor: { type: "number", description: "Desired floor" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_my_bookings",
      description: "Get the current user's bookings",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "cancel_booking",
      description: "Cancel a specific booking by its ID",
      parameters: {
        type: "object",
        properties: {
          bookingId: { type: "string", description: "The ID of the booking to cancel" }
        },
        required: ["bookingId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "submit_feedback",
      description: "Submit a rating and comment for a completed stay",
      parameters: {
        type: "object",
        properties: {
          bookingId: { type: "string", description: "The ID of the booking" },
          rating: { type: "number", description: "Rating from 1 to 5" },
          comment: { type: "string", description: "Feedback comment" }
        },
        required: ["bookingId", "rating"]
      }
    }
  }
];

// Tool Implementation Map
const toolImplementations = {
  get_available_rooms: async (args) => {
    const query = { status: 'vacant' };
    if (args.type) query.type = args.type;
    if (args.floor) query.floor = args.floor;
    const rooms = await Room.find(query).limit(5);
    return rooms.map(r => ({
      roomNumber: r.roomNumber,
      type: r.type,
      price: r.pricePerNight,
      floor: r.floor,
      block: r.block
    }));
  },
  get_my_bookings: async (args, userId) => {
    const bookings = await Booking.find({ user: userId })
      .populate('room', 'roomNumber type')
      .sort({ createdAt: -1 })
      .limit(5);
    return bookings.map(b => ({
      id: b._id,
      room: b.room?.roomNumber,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      status: b.status,
      total: b.totalAmount
    }));
  },
  cancel_booking: async (args, userId) => {
    const booking = await Booking.findOne({ _id: args.bookingId, user: userId });
    if (!booking) return { error: "Booking not found or not owned by you" };
    if (booking.checkedInAt) return { error: "Cannot cancel a booking after check-in" };
    
    booking.status = 'cancelled';
    await booking.save();
    return { success: true, message: `Booking ${args.bookingId} cancelled successfully` };
  },
  submit_feedback: async (args, userId) => {
    const booking = await Booking.findOne({ _id: args.bookingId, user: userId });
    if (!booking) return { error: "Booking not found" };
    
    let review = await Review.findOne({ booking: args.bookingId });
    if (review) {
      review.rating = args.rating;
      review.comment = args.comment;
      await review.save();
    } else {
      review = await Review.create({
        booking: args.bookingId,
        room: booking.room,
        user: userId,
        rating: args.rating,
        comment: args.comment
      });
    }
    return { success: true, message: "Feedback submitted successfully" };
  }
};

/**
 * OpenRouter AI Integration (OpenAI Compatible)
 */
export const processAIChat = async (userId, message, history = []) => {
  const apiKey = (process.env.OPENROUTER_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured in environment variables");
  }

  // Convert history to OpenAI format
  const messages = [
    {
      role: "system",
      content: "You are the NFSU Campus AI Assistant, a helpful AI specialized in managing room bookings and responding to guest queries. You can check availability, get booking status, cancel bookings, and submit feedback. Be professional, concise, and helpful."
    },
    ...history.map(h => ({
      role: h.senderType === 'user' ? 'user' : 'assistant',
      content: h.content
    })),
    { role: "user", content: message }
  ];

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/proffaro/nfsu-guest-booking-system",
        "X-Title": "NFSU Guest Booking System"
      },
      body: JSON.stringify({
        model: "openrouter/free", 
        messages,
        tools,
        tool_choice: "auto"
      })
    });

    const data = await response.json();
    if (!response.ok) {
        console.error("OpenRouter Error Details:", JSON.stringify(data, null, 2));
        if (response.status === 429) {
          throw new Error("The AI model is currently at capacity or rate-limited. Please try again in 1 minute.");
        }
        if (data.error?.message?.includes("data policy")) {
          throw new Error("OpenRouter Privacy Policy Error: You must enable 'Free model publication' in your OpenRouter settings (https://openrouter.ai/settings/privacy) to use this model.");
        }
        throw new Error(data.error?.message || `OpenRouter API error: ${response.status}`);
    }

    const aiMessage = data.choices[0].message;

    // Handle Tool Calls
    if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
      const toolCall = aiMessage.tool_calls[0];
      const { name, arguments: argsString } = toolCall.function;
      const args = JSON.parse(argsString);
      
      const toolFn = toolImplementations[name];
      if (toolFn) {
        const toolResult = await toolFn(args, userId);
        
        // Push the assistant message with tool call
        messages.push(aiMessage);
        
        // Push the tool result
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: name,
          content: JSON.stringify(toolResult)
        });

        // Send back to OpenRouter for final natural language response
        const finalResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "openrouter/free",
            messages
          })
        });

        const finalData = await finalResponse.json();
        return {
          text: finalData.choices[0].message.content,
          action: name,
          result: toolResult
        };
      }
    }

    return { text: aiMessage.content };
  } catch (error) {
    console.error("OpenRouter Agent Exception:", error);
    throw error;
  }
};
