import Room from "../models/Room.js";
import Booking from "../models/Booking.js";
import Review from "../models/Review.js";
import FAQ from "../models/FAQ.js";
import ChatThread from "../models/ChatThread.js";
import ChatMessage from "../models/ChatMessage.js";
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
      name: "create_booking",
      description: "Create a new room booking for the user",
      parameters: {
        type: "object",
        properties: {
          roomNumber: { type: "string", description: "The room number to book (e.g. 101)" },
          checkIn: { type: "string", description: "Check-in date (ISO format, e.g. 2024-03-20)" },
          checkOut: { type: "string", description: "Check-out date (ISO format, e.g. 2024-03-22)" },
          guestName: { type: "string", description: "Full name of the primary guest" },
          email: { type: "string", description: "Guest email address" },
          phone: { type: "string", description: "Guest 10-digit phone number" },
          numberOfGuests: { type: "integer", minimum: 1, maximum: 4, description: "Number of guests (1-4)" },
          purpose: { type: "string", enum: ["academic", "business", "personal", "other"], description: "Purpose of stay" },
          purposeDetails: { type: "string", description: "Optional details about the purpose of stay" }
        },
        required: ["roomNumber", "checkIn", "checkOut", "guestName", "email", "phone", "numberOfGuests", "purpose"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "escalate_to_staff",
      description: "Escalate the conversation to a real human support staff member when AI cannot help",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "The reason or summary of the problem for the staff member" }
        },
        required: ["reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "modify_booking",
      description: "Modify the check-in or check-out dates for an existing booking (Stay extension or shift)",
      parameters: {
        type: "object",
        properties: {
          bookingId: { type: "string", description: "The ID of the booking to modify" },
          newCheckIn: { type: "string", description: "New requested check-in date (ISO format)" },
          newCheckOut: { type: "string", description: "New requested check-out date (ISO format)" }
        },
        required: ["bookingId", "newCheckIn", "newCheckOut"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_my_gatepass",
      description: "Retrieve the Smart Gatepass QR code and check-in token for a confirmed booking",
      parameters: {
        type: "object",
        properties: {
          bookingId: { type: "string", description: "Optional booking ID. If omitted, retrieves the most recent confirmed booking." }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "report_room_issue",
      description: "Report a maintenance issue or problem with the current room",
      parameters: {
        type: "object",
        properties: {
          roomNumber: { type: "string", description: "The room number where the issue is occurring" },
          issueDescription: { type: "string", description: "A detailed description of the problem" }
        },
        required: ["roomNumber", "issueDescription"]
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
  create_booking: async (args, userId) => {
    const room = await Room.findOne({ roomNumber: args.roomNumber });
    if (!room) throw new Error(`Room ${args.roomNumber} not found.`);

    const checkInDate = new Date(args.checkIn);
    const checkOutDate = new Date(args.checkOut);

    if (checkInDate >= checkOutDate) {
      throw new Error("Check-out date must be after check-in date.");
    }

    if (checkInDate < new Date().setHours(0,0,0,0)) {
      throw new Error("Check-in date cannot be in the past.");
    }

    // Check availability
    const isAvailable = await Booking.checkRoomAvailability(room._id, checkInDate, checkOutDate);
    if (!isAvailable) {
      throw new Error(`Room ${args.roomNumber} is not available for the selected dates.`);
    }

    // Acquire hold
    const heldRoom = await Room.acquireHold(room._id, userId, 10 * 60);
    if (!heldRoom) {
      return {
        success: false,
        message: "I could not place a temporary hold on this room. This usually means the room is either currently occupied by another guest or in maintenance, even if it's available for your future dates. Please try another room number or contact staff for assistance.",
        error: "HOLD_FAILED"
      };
    }

    // Calculate total amount
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const totalAmount = nights * room.pricePerNight;

    // Create booking
    const booking = new Booking({
      user: userId,
      room: room._id,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guestName: args.guestName,
      email: args.email,
      phone: args.phone,
      purpose: args.purpose,
      purposeDetails: args.purposeDetails,
      numberOfGuests: args.numberOfGuests,
      totalAmount,
      status: 'pending',
      paymentStatus: 'unpaid'
    });

    try {
      await booking.save();

      await logEvent({
        userId,
        action: 'BOOKING_CREATE',
        details: { 
          bookingId: booking._id, 
          room: room._id, 
          checkIn: args.checkIn, 
          checkOut: args.checkOut, 
          source: 'ai_assistant' 
        }
      });

      return {
        success: true,
        message: `Booking created successfully for Room ${args.roomNumber}. Your stay from ${checkInDate.toLocaleDateString()} to ${checkOutDate.toLocaleDateString()} is now pending payment.`,
        data: {
          bookingId: booking._id,
          totalAmount,
          nights,
          roomNumber: room.roomNumber,
          status: booking.status
        }
      };
    } catch (error) {
      console.error("AI Booking Execution Error:", error);
      return {
        success: false,
        message: `I encountered an issue while finalizing your booking: ${error.message}`,
        error: "BOOKING_FAILED"
      };
    }
  },
  escalate_to_staff: async (args, userId) => {
    // 1. Create a support thread
    const thread = await ChatThread.create({
      user: userId,
      type: 'support',
      status: 'open',
      lastMessageAt: Date.now()
    });

    // 2. Add the initial message explaining why it was escalated
    await ChatMessage.create({
      thread: thread._id,
      sender: userId,
      senderType: 'user',
      content: `[AUTO-ESCALATED FROM CAMPUS AI]\n\nReason: ${args.reason}`
    });

    await logEvent({
      userId,
      action: 'SUPPORT_ESCALATE',
      details: { threadId: thread._id, reason: args.reason }
    });

    return {
      success: true,
      message: "A support ticket has been opened for you. A real staff member will respond to you in the support tab shortly.",
      data: { threadId: thread._id, reason: args.reason }
    };
  },
  modify_booking: async (args, userId) => {
    const booking = await Booking.findById(args.bookingId).populate('room');
    if (!booking) throw new Error("Booking not found.");
    if (booking.user.toString() !== userId.toString()) throw new Error("Permission denied.");
    if (['cancelled', 'completed'].includes(booking.status)) throw new Error(`Cannot modify a ${booking.status} booking.`);
    if (booking.checkedInAt) throw new Error("Cannot modify booking after check-in. Please contact staff at reception.");

    const newIn = new Date(args.newCheckIn);
    const newOut = new Date(args.newCheckOut);

    // Check availability (excluding this booking)
    const isAvailable = await Booking.checkRoomAvailability(booking.room._id, newIn, newOut, booking._id);
    if (!isAvailable) throw new Error("Room is not available for requested new dates.");

    // Calculate new total
    const nights = Math.ceil((newOut - newIn) / (1000 * 60 * 60 * 24));
    const newTotal = nights * booking.room.pricePerNight;
    const priceDiff = newTotal - booking.totalAmount;

    const oldIn = booking.checkIn;
    const oldOut = booking.checkOut;

    booking.checkIn = newIn;
    booking.checkOut = newOut;
    booking.totalAmount = newTotal;
    await booking.save();

    await logEvent({
      userId,
      action: 'BOOKING_UPDATE',
      details: { 
        bookingId: booking._id, 
        action: 'AI_MODIFICATION',
        oldDates: { in: oldIn, out: oldOut },
        newDates: { in: newIn, out: newOut },
        priceDiff
      }
    });

    return {
      success: true,
      message: `Booking modified successfully. New total: ₹${newTotal}.`,
      data: {
        bookingId: booking._id,
        newDates: { in: newIn, out: newOut },
        priceDiff,
        newTotal
      }
    };
  },
  get_my_gatepass: async (args, userId) => {
    let query = { user: userId, status: 'confirmed' };
    if (args.bookingId) query._id = args.bookingId;

    const booking = await Booking.findOne(query).sort({ checkIn: 1 });
    if (!booking) {
      throw new Error("No confirmed booking found. Please ensure your booking is confirmed before requesting a gatepass.");
    }

    if (!booking.checkInToken || !booking.qrCode) {
      throw new Error("Gatepass is not yet generated for this booking. Please contact front desk.");
    }

    return {
      success: true,
      bookingId: booking._id,
      roomNumber: (await booking.populate('room', 'roomNumber')).room?.roomNumber,
      token: booking.checkInToken,
      qrCode: booking.qrCode, // Base64
      checkIn: booking.checkIn
    };
  },
  report_room_issue: async (args, userId) => {
    const room = await Room.findOne({ roomNumber: args.roomNumber });
    if (!room) throw new Error(`Room ${args.roomNumber} not found.`);
    
    const timestamp = new Date().toLocaleString();
    const issueEntry = `\n[ISSUE REPORTED ${timestamp}]: ${args.issueDescription}`;
    
    room.notes = (room.notes || "") + issueEntry;
    await room.save();

    await logEvent({
      userId,
      action: 'MAINTENANCE_REPORT',
      details: { roomNumber: args.roomNumber, issue: args.issueDescription, source: 'ai_assistant' }
    });

    return { 
      success: true, 
      message: `Issue for Room ${args.roomNumber} has been logged and reported to the maintenance staff.`,
      data: { roomNumber: args.roomNumber, timestamp }
    };
  },
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

    let aiMessage = data.choices[0].message;
    let content = aiMessage.content || "";

    // FALLBACK: Handle XML-style tool calls (sometimes generated by free models)
    // Format: <tool_call>function_name <arg_key>K</arg_key> <arg_value>V</arg_value> </tool_call>
    if (!aiMessage.tool_calls && content.includes("<tool_call>")) {
        try {
            const toolMatch = content.match(/<tool_call>(.*?)\s+(?:<arg_key>(.*?)<\/arg_key>\s*<arg_value>(.*?)<\/arg_value>\s*)*<\/tool_call>/is);
            if (toolMatch) {
                const name = toolMatch[1].trim();
                const args = {};
                
                // Extract multiple key-value pairs if present
                const argRegex = /<arg_key>(.*?)<\/arg_key>\s*<arg_value>(.*?)<\/arg_value>/g;
                let argMatch;
                while ((argMatch = argRegex.exec(content)) !== null) {
                    let val = argMatch[2];
                    // Convert types
                    if (val.toLowerCase() === 'true') val = true;
                    else if (val.toLowerCase() === 'false') val = false;
                    else if (!isNaN(val)) val = Number(val);
                    args[argMatch[1]] = val;
                }

                const toolFn = toolImplementations[name];
                if (toolFn) {
                    const toolResult = await toolFn(args, userId);
                    
                    // Manually simulate the tool loop
                    messages.push({ role: "assistant", content: content });
                    messages.push({
                      role: "tool",
                      tool_call_id: "manual_" + Date.now(),
                      name: name,
                      content: JSON.stringify(toolResult)
                    });

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
                    
                    if (!finalResponse.ok || !finalData.choices?.[0]) {
                        console.error("OpenRouter Follow-up Error:", finalData);
                        return {
                            text: `Action '${name}' was successful, but I had trouble generating a follow-up response.`,
                            action: name,
                            result: toolResult
                        };
                    }

                    return {
                        text: finalData.choices[0].message.content,
                        action: name,
                        result: toolResult
                    };
                }
            }
        } catch (err) {
            console.error("Manual tool call parsing failed:", err);
        }
    }

    // Handle Native Tool Calls (OpenAI Format)
    if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
      const toolCall = aiMessage.tool_calls[0];
      const { name, arguments: argsString } = toolCall.function;
      let args = {};
      try {
          // Robust parsing to handle potential LLM quirks
          let sanitized = argsString
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
          
          // Handle common case: AI adds a trailing comma before the closing brace
          sanitized = sanitized.replace(/,(\s*[\]}])/g, "$1");
          
          args = JSON.parse(sanitized);
      } catch (parseError) {
          console.error("AI Tool Call Parse Error:", parseError.message, "Raw String:", argsString);
          throw new Error("I encountered a formatting error while trying to process that action. Could you please rephrase your request?");
      }
      
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
        
        if (!finalResponse.ok || !finalData.choices?.[0]) {
          console.error("OpenRouter Follow-up Error:", finalData);
          return {
            text: `The action '${name}' was completed successfully, but I encountered an error while summarizing the result for you.`,
            action: name,
            result: toolResult
          };
        }

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
