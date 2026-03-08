import Room from "../models/Room.js";
import Booking from "../models/Booking.js";
import Review from "../models/Review.js";
import FAQ from "../models/FAQ.js";
import { sendEmail, bookingCancellationEmail } from '../services/emailService.js';
import { logEvent } from '../utils/auditLogger.js';

// Tool Definitions (OpenAI Specification)
const tools = [
  {
    type: "function",
    function: {
      name: "get_room_details",
      description: "Get comprehensive details about a specific room including amenities and description",
      parameters: {
        type: "object",
        properties: {
          roomNumber: { type: "string", description: "The room number (e.g. 101, B-205)" }
        },
        required: ["roomNumber"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "find_faq",
      description: "Search the database for answers to common questions about stay, policy, and facilities",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The keyword or question to search for" },
          category: { type: "string", enum: ["general", "booking", "check-in", "amenities", "other"], description: "Optional category filter" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_available_rooms",
      description: "Get a list of available rooms based on type, dates, budget, Block, and facilities",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["single", "double"], description: "Room type" },
          floor: { type: "string", description: "Desired floor number (1-6)" },
          block: { type: "string", enum: ["A", "B", "C", "D", "E", "F"], description: "Block letter" },
          minPrice: { type: "number", description: "Minimum price per night" },
          maxPrice: { type: "number", description: "Maximum price per night (budget)" },
          facilities: { 
            type: "array", 
            items: { type: "string", enum: ["Gym", "WiFi", "AC", "TV", "Refrigerator", "Balcony", "Parking"] },
            description: "List of required facilities"
          },
          minRating: { type: "number", description: "Minimum star rating (0-5)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_my_bookings",
      description: "Get the current user's bookings with optional filtering",
      parameters: { 
        type: "object", 
        properties: {
          status: { type: "string", enum: ["pending", "confirmed", "cancelled", "checked-in", "checked-out"], description: "Filter by booking status" },
          upcoming: { type: "boolean", description: "If true, only returns future or current bookings (not cancelled/checked-out)" }
        }
      }
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
          bookingId: { type: "string", description: "The ID of the booking to cancel" },
          reason: { type: "string", description: "The reason for cancellation (optional)" }
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
  get_room_details: async (args) => {
    const room = await Room.findOne({ roomNumber: args.roomNumber });
    if (!room) return { error: "Room not found" };
    
    return {
      roomNumber: room.roomNumber,
      type: room.type,
      price: room.pricePerNight,
      floor: room.floor,
      block: room.block,
      facilities: room.facilities,
      amenities: room.amenities,
      rating: room.rating,
      numReviews: room.numReviews,
      description: room.description,
      primaryImage: room.images.find(img => img.isPrimary)?.url || room.images[0]?.url,
      status: room.status
    };
  },
  find_faq: async (args) => {
    const query = {
      $or: [
        { question: { $regex: args.query, $options: 'i' } },
        { answer: { $regex: args.query, $options: 'i' } }
      ]
    };
    if (args.category) query.category = args.category;

    const faqs = await FAQ.find(query).limit(5);
    return faqs.map(f => ({
      question: f.question,
      answer: f.answer,
      category: f.category
    }));
  },
  get_available_rooms: async (args) => {
    const query = { status: 'vacant', isActive: true };
    if (args.type) query.type = args.type;
    if (args.floor) query.floor = String(args.floor);
    if (args.block) query.block = args.block;
    if (args.minRating) query.rating = { $gte: args.minRating };
    if (args.facilities && args.facilities.length > 0) {
      query.facilities = { $all: args.facilities };
    }
    
    // Handle price range
    if (args.minPrice || args.maxPrice) {
      query.pricePerNight = {};
      if (args.minPrice) query.pricePerNight.$gte = args.minPrice;
      if (args.maxPrice) query.pricePerNight.$lte = args.maxPrice;
    }

    const rooms = await Room.find(query).sort({ rating: -1, pricePerNight: 1 }).limit(10);
    return rooms.map(r => ({
      roomNumber: r.roomNumber,
      type: r.type,
      price: r.pricePerNight,
      floor: r.floor,
      block: r.block,
      facilities: r.facilities,
      rating: r.rating
    }));
  },
  get_my_bookings: async (args, userId) => {
    const query = { user: userId };
    if (args.status) query.status = args.status;
    if (args.upcoming) {
      query.status = { $in: ['pending', 'confirmed', 'checked-in'] };
      query.checkOut = { $gte: new Date() };
    }

    const bookings = await Booking.find(query)
      .populate('room', 'roomNumber type')
      .sort({ createdAt: -1 });

    return bookings.map(b => ({
      id: b._id,
      room: b.room?.roomNumber,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      status: b.status,
      paymentStatus: b.paymentStatus,
      total: b.totalAmount,
      checkedInAt: b.checkedInAt,
      checkedOutAt: b.checkedOutAt,
      cancellationReason: b.cancellationReason
    }));
  },
  cancel_booking: async (args, userId) => {
    const booking = await Booking.findById(args.bookingId);
    if (!booking) throw new Error("Booking not found.");
    
    // Authorization
    if (booking.user.toString() !== userId.toString()) {
      throw new Error("You do not have permission to cancel this booking.");
    }

    // Status checks
    if (['cancelled', 'completed'].includes(booking.status)) {
      throw new Error(`Booking cannot be cancelled because it is already ${booking.status}.`);
    }

    if (booking.checkedInAt) {
      throw new Error("Booking cannot be cancelled after check-in.");
    }

    const oldStatus = booking.status;
    const reason = args.reason || 'Cancelled via Campus AI';
    
    // Save previous state for logic
    await booking.cancel(reason, userId);

    // Update room status if it was confirmed
    if (oldStatus === 'confirmed') {
      await Room.findByIdAndUpdate(booking.room, { status: 'vacant', holdBy: null, holdUntil: null });
    }

    // Populate for email
    await booking.populate('room', 'roomNumber type floor block pricePerNight');

    // Fire-and-forget: send cancellation email
    sendEmail(booking.email, bookingCancellationEmail(booking)).catch(() => { });

    // Log audit event
    await logEvent({
      userId,
      action: 'BOOKING_CANCEL',
      details: { bookingId: booking._id, reason, source: 'ai_assistant' }
    });

    return { 
      success: true, 
      message: "Booking cancelled successfully. A confirmation email has been sent to your registered address.",
      data: {
        id: booking._id,
        room: booking.room?.roomNumber,
        status: booking.status
      }
    };
  },
  submit_feedback: async (args, userId) => {
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5.");
    }
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
