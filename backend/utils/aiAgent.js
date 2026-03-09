import Room from "../models/Room.js";
import Booking from "../models/Booking.js";
import Review from "../models/Review.js";
import FAQ from "../models/FAQ.js";
import ChatThread from "../models/ChatThread.js";
import ChatMessage from "../models/ChatMessage.js";
import AuditLog from "../models/AuditLog.js";
import User from "../models/User.js";
import { sendEmail, bookingCancellationEmail, bookingPendingEmail, bookingUpdateEmail, maintenanceReportEmail, supplyRequestEmail, bookingConfirmationEmail, gatepassEmail, invoiceEmail } from '../services/emailService.js';
import { generateInvoicePDFBuffer } from '../services/invoiceService.js';
import { logEvent } from '../utils/auditLogger.js';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { getIO } from '../realtime/socket.js';

const tools = [
  {
    type: "function",
    function: {
      name: "get_room_details",
      description: "Get comprehensive details about a specific room including amenities, description, and primary image.",
      parameters: {
        type: "object",
        properties: {
          roomNumber: { type: "string", description: "The room number (e.g. 101, A-205)" }
        },
        required: ["roomNumber"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "find_faq",
      description: "Search for answers to questions about the campus, stay policies, facilities, and more. Use this when the user asks 'how do I...', 'what is...', or 'is there...'",
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
      name: "escalate_to_staff",
      description: "Use this ONLY when the AI cannot answer a question or handle a request, or if the user explicitly asks for a human.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "Mandatory reason for escalation" }
        },
        required: ["reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "modify_booking",
      description: "Update an existing booking (dates, guest details, etc.)",
      parameters: {
        type: "object",
        properties: {
          bookingId: { type: "string", description: "The actual Mongo ID or short ID of the booking" },
          newCheckIn: { type: "string", description: "New check-in date (YYYY-MM-DD)" },
          newCheckOut: { type: "string", description: "New check-out date (YYYY-MM-DD)" },
          guestName: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          purpose: { type: "string", enum: ["academic", "business", "personal", "other"] },
          purposeDetails: { type: "string" },
          numberOfGuests: { type: "number" },
          specialRequests: { type: "string" }
        },
        required: ["bookingId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_my_gatepass",
      description: "Get the QR gatepass and check-in token for entry.",
      parameters: {
        type: "object",
        properties: {
          bookingId: { type: "string", description: "Optional specific booking ID" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "report_room_issue",
      description: "Report maintenance or cleanliness issues for a room.",
      parameters: {
        type: "object",
        properties: {
          roomNumber: { type: "string" },
          issueDescription: { type: "string", description: "Detailed description of the problem" }
        },
        required: ["roomNumber", "issueDescription"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_available_rooms",
      description: "Find available rooms with extreme flexibility. Can filter by dates, type, price range, block, floor, or specific amenities. If dates are missed, it searches for immediate availability.",
      parameters: {
        type: "object",
        properties: {
          checkIn: { type: "string", description: "YYYY-MM-DD format" },
          checkOut: { type: "string", description: "YYYY-MM-DD format" },
          type: { type: "string", enum: ["single", "double"] },
          floor: { type: "string", description: "Floor level (1-6)" },
          block: { type: "string", enum: ["A", "B", "C", "D", "E", "F"] },
          maxPrice: { type: "number", description: "User's maximum budget" },
          minRating: { type: "number", description: "Minimum star rating 0-5" },
          query: { type: "string", description: "Fuzzy search query for features (e.g. 'ac', 'garden view', 'near gate')" },
          facilities: { type: "array", items: { type: "string" }, description: "Specific list of facility keywords" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_booking",
      description: "Create a room reservation. ALWAYS verify availability via get_available_rooms first.",
      parameters: {
        type: "object",
        properties: {
          roomNumber: { type: "string", description: "The room number to book, e.g. '101'" },
          checkIn: { type: "string", description: "Check-in date in YYYY-MM-DD format. MUST be a concrete date, never a relative term like 'today'." },
          checkOut: { type: "string", description: "Check-out date in YYYY-MM-DD format. MUST be a concrete date, never a relative term like 'tomorrow'." },
          guestName: { type: "string", description: "Optional. Do NOT ask for this. System auto-fills from profile." },
          email: { type: "string", description: "Optional. Do NOT ask for this. System auto-fills from profile." },
          phone: { type: "string", description: "Optional. Do NOT ask for this. System auto-fills from profile." },
          purpose: { type: "string", enum: ["academic", "business", "personal", "other"] },
          numberOfGuests: { type: "number" },
          specialRequests: { type: "string", description: "Optional. Do NOT ask for this. System auto-fills or leaves blank." }
        },
        required: ["roomNumber", "checkIn", "checkOut", "purpose", "numberOfGuests"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_my_bookings",
      description: "List the user's booking history and currently active/upcoming trips.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "confirmed", "cancelled", "checked-in", "checked-out"] },
          upcoming: { type: "boolean", description: "Set true to filter for only valid future/current bookings" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_booking_details",
      description: "Get deep-dive status of a reservation including payment, check-in time, and staff notes.",
      parameters: {
        type: "object",
        properties: {
          bookingId: { type: "string" }
        },
        required: ["bookingId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "cancel_booking",
      description: "Cancel a booking. Always ask for confirmation first.",
      parameters: {
        type: "object",
        properties: {
          bookingId: { type: "string" },
          reason: { type: "string" }
        },
        required: ["bookingId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_my_profile",
      description: "Get the current user's account details (Name, Role, Email, Phone). Use this when the user asks 'who am I' or 'what is my info'.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate_stay_quote",
      description: "Calculate the total cost for a room stay without making a booking.",
      parameters: {
        type: "object",
        properties: {
          roomNumber: { type: "string" },
          checkIn: { type: "string" },
          checkOut: { type: "string" }
        },
        required: ["roomNumber", "checkIn", "checkOut"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_system_info",
      description: "Get general info about the building like check-in/out times, food hours, and local orientation.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "submit_feedback",
      description: "Submit a review/rating for a completed or checked-out booking. The user can reference a booking by its ID OR by room number (the system will auto-find the most recent eligible booking). If the user already submitted feedback for the same booking, this will update their existing review. Use this when the user says things like 'rate my stay', 'leave feedback', 'review my room', '5 stars', 'great experience', etc.",
      parameters: {
        type: "object",
        properties: {
          bookingId: { type: "string", description: "The booking ID to review. Optional if roomNumber is provided — system will auto-find the latest completed booking for that room." },
          roomNumber: { type: "string", description: "Alternative to bookingId. The room number the user stayed in (e.g. '101'). System will find the most recent completed/checked-out booking for this room." },
          rating: { type: "number", description: "Star rating from 1 to 5. 1=Poor, 2=Fair, 3=Good, 4=VeryGood, 5=Excellent. Infer from natural language: 'amazing'=5, 'good'=4, 'okay'=3, 'bad'=2, 'terrible'=1." },
          comment: { type: "string", description: "Optional text review/comment about their stay experience. Max 500 characters. Extract from what the user says naturally — they don't need to explicitly say 'comment is...'." }
        },
        required: ["rating"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "request_supplies",
      description: "Request housekeeping supplies, amenities, or room service items for a specific room. Use when the user asks for towels, toiletries, pillows, blankets, water bottles, cleaning, room service, or any in-room needs. The system auto-detects the user's active room if roomNumber is not explicitly given.",
      parameters: {
        type: "object",
        properties: {
          roomNumber: { type: "string", description: "The room number to deliver supplies to. If the user doesn't specify, try to infer from their active/checked-in booking." },
          items: {
            type: "array",
            description: "List of items requested. Parse naturally from user input — 'I need 2 towels and a pillow' → [{name:'Towel', quantity:2}, {name:'Pillow', quantity:1}]",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Name of the supply item (e.g. 'Towel', 'Pillow', 'Water Bottle', 'Soap', 'Toothbrush', 'Blanket', 'Iron', 'Kettle', 'Room Freshener')" },
                quantity: { type: "number", description: "How many of this item. Defaults to 1 if the user doesn't specify a number." }
              },
              required: ["name"]
            }
          },
          specialInstructions: { type: "string", description: "Any special delivery instructions, timing preferences, or additional context. E.g. 'please deliver before 10 PM', 'hypoallergenic only', 'extra soft pillows'." }
        },
        required: ["roomNumber", "items"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "cancel_multiple_bookings",
      description: "Cancel multiple bookings at once (bulk cancellation). Use when the user wants to cancel all their bookings, or cancel several specific bookings in one go. IMPORTANT: Always show the user their bookings first via 'get_my_bookings' and ask for explicit confirmation before calling this. Never cancel without confirmation.",
      parameters: {
        type: "object",
        properties: {
          bookingIds: {
            type: "array",
            description: "Array of booking IDs to cancel. Get these from 'get_my_bookings' first. Only include bookings that are 'pending' or 'confirmed' — already cancelled/completed/checked-in bookings cannot be bulk-cancelled.",
            items: { type: "string" }
          },
          reason: { type: "string", description: "Optional reason for bulk cancellation. If the user says why (e.g. 'plans changed', 'trip cancelled'), include it here. Defaults to 'Bulk Cancellation via Campus AI'." }
        },
        required: ["bookingIds"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "extend_stay",
      description: "Extend a guest's current stay by additional nights OR to a specific new checkout date. Automatically finds the user's active/upcoming booking if no bookingId is given. Checks room availability for the extended period, recalculates pricing, and sends an update email. Use when the user says things like 'can I stay 2 more nights', 'extend my stay', 'I want to check out on Friday instead', 'add 3 extra nights'.",
      parameters: {
        type: "object",
        properties: {
          bookingId: { type: "string", description: "Optional. The specific booking to extend. If not given, auto-detects the user's most recent active/confirmed/checked-in booking." },
          roomNumber: { type: "string", description: "Optional alternative. Find the active booking for this room number." },
          additionalNights: { type: "number", description: "Number of extra nights to add to the current checkout date. E.g., '2 more nights' → 2. Use this OR newCheckOut, not both." },
          newCheckOut: { type: "string", description: "Specific new checkout date in YYYY-MM-DD format. Use this when the user gives an exact date like 'extend until March 15'. Use this OR additionalNights, not both." }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_booking_invoice",
      description: "Retrieve a detailed invoice/receipt for a booking. Returns structured billing data including guest info, room details, nights breakdown, charges, payment status, and a link to download the PDF. Works for any booking status. Use when the user asks for 'invoice', 'receipt', 'bill', 'payment details', or needs documentation for reimbursement.",
      parameters: {
        type: "object",
        properties: {
          bookingId: { type: "string", description: "The booking ID. Optional if roomNumber is provided or only one recent booking exists." },
          roomNumber: { type: "string", description: "Optional. Find the most recent booking for this room to generate invoice for." }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "compare_rooms",
      description: "Compare 2 to 5 rooms side-by-side with detailed info including pricing, facilities, amenities, ratings, reviews, floor, block, and live availability. Use when the user says 'compare room 101 and 205', 'which room is better', 'difference between single and double rooms', 'show me options'. Can optionally check availability for specific dates.",
      parameters: {
        type: "object",
        properties: {
          roomNumbers: {
            type: "array",
            description: "Array of room numbers to compare (2-5 rooms). E.g., ['101', '205', '302']",
            items: { type: "string" }
          },
          checkIn: { type: "string", description: "Optional. Check-in date (YYYY-MM-DD) to verify availability for each room during comparison." },
          checkOut: { type: "string", description: "Optional. Check-out date (YYYY-MM-DD) to verify availability and calculate total cost for comparison." }
        },
        required: ["roomNumbers"]
      }
    }
  }
];

// Tool Implementation Map
export const toolImplementations = {
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

    const oldData = {
      in: booking.checkIn,
      out: booking.checkOut,
      total: booking.totalAmount,
      purpose: booking.purpose,
      guestName: booking.guestName
    };

    let priceDiff = 0;
    let newIn = booking.checkIn;
    let newOut = booking.checkOut;

    // Handle Date Changes
    if (args.newCheckIn || args.newCheckOut) {
      const resolveDate = (input) => {
        if (!input) return null;
        const lower = String(input).toLowerCase().trim();
        const now = new Date();
        if (lower === 'today' || lower === 'now') return new Date(now.toISOString().split('T')[0]);
        if (lower === 'tomorrow' || lower === 'tmrw') {
          const d = new Date(now); d.setDate(d.getDate() + 1); return new Date(d.toISOString().split('T')[0]);
        }
        if (lower.includes('day after tomorrow')) {
          const d = new Date(now); d.setDate(d.getDate() + 2); return new Date(d.toISOString().split('T')[0]);
        }
        return new Date(input);
      };
      newIn = args.newCheckIn ? resolveDate(args.newCheckIn) : booking.checkIn;
      newOut = args.newCheckOut ? resolveDate(args.newCheckOut) : booking.checkOut;

      const isAvailable = await Booking.checkRoomAvailability(booking.room._id, newIn, newOut, booking._id);
      if (!isAvailable) throw new Error("Room is not available for requested new dates.");

      const nights = Math.ceil((newOut - newIn) / (1000 * 60 * 60 * 24));
      const newTotal = nights * booking.room.pricePerNight;
      priceDiff = newTotal - booking.totalAmount;

      booking.checkIn = newIn;
      booking.checkOut = newOut;
      booking.totalAmount = newTotal;
    }

    // Handle Other Details
    if (args.guestName) booking.guestName = args.guestName;
    if (args.email) booking.email = args.email;
    if (args.phone) booking.phone = args.phone;
    if (args.purpose) booking.purpose = args.purpose;
    if (args.purposeDetails) booking.purposeDetails = args.purposeDetails;
    if (args.numberOfGuests) booking.numberOfGuests = args.numberOfGuests;
    if (args.specialRequests) booking.specialRequests = args.specialRequests;

    await booking.save();

    await logEvent({
      userId,
      action: 'BOOKING_UPDATE',
      details: {
        bookingId: booking._id,
        action: 'AI_MODIFICATION',
        updates: args,
        priceDiff
      }
    });

    const updatedFields = Object.keys(args).filter(k => k !== 'bookingId');
    sendEmail(booking.email, bookingUpdateEmail(booking, updatedFields, priceDiff)).catch(() => { });

    return {
      success: true,
      message: `Booking details updated successfully.${priceDiff !== 0 ? ` New total: ₹${booking.totalAmount}.` : ''}`,
      data: {
        bookingId: booking._id,
        newDates: { in: booking.checkIn, out: booking.checkOut },
        priceDiff,
        newTotal: booking.totalAmount,
        updatedFields: Object.keys(args).filter(k => k !== 'bookingId')
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
    const timestamp = new Date().toLocaleString();
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60000);

    // 1. Prevent exact duplicate reports within 5 minutes (same room, same issue)
    const existingLog = await AuditLog.findOne({
      user: userId,
      action: 'MAINTENANCE_REPORT',
      'details.roomNumber': args.roomNumber,
      'details.issue': args.issueDescription,
      createdAt: { $gte: fiveMinutesAgo }
    });

    if (existingLog) {
      return {
        success: true,
        message: `Issue for Room ${args.roomNumber} has already been logged. Maintenance staff is already notified.`,
        data: { roomNumber: args.roomNumber, timestamp: existingLog.createdAt.toLocaleString(), duplicate: true }
      };
    }
    const issueEntry = `\n[ISSUE REPORTED ${timestamp}]: ${args.issueDescription}`;

    room.notes = (room.notes || "") + issueEntry;
    await room.save();

    // 1. Log to Audit Log (for Dashboard widget)
    await logEvent({
      userId,
      action: 'MAINTENANCE_REPORT',
      details: { roomNumber: args.roomNumber, issue: args.issueDescription, source: 'ai_assistant' }
    });

    // 2. Create/Update Support Thread to notify staff in Support Inbox
    try {
      let thread = await ChatThread.findOne({ user: userId, type: 'support', status: 'open' });
      if (!thread) {
        thread = await ChatThread.create({
          user: userId,
          type: 'support',
          status: 'open',
          lastMessageAt: Date.now(),
          title: `Room ${args.roomNumber} Issue`
        });
      } else {
        thread.lastMessageAt = Date.now();
        await thread.save();
      }

      await ChatMessage.create({
        thread: thread._id,
        sender: null, // Sent by System/AI
        senderType: 'ai',
        content: `[MAINTENANCE REPORTED VIA AI]\nRoom: ${args.roomNumber}\nIssue: ${args.issueDescription}\nTime: ${timestamp}`,
        type: 'action',
        metadata: { action: 'report_room_issue', roomNumber: args.roomNumber, issue: args.issueDescription }
      });
    } catch (err) {
      console.error("Failed to create support thread for maintenance report:", err);
    }

    try {
      const activeBooking = await Booking.findOne({ user: userId, room: room._id, status: { $in: ['confirmed', 'checked-in'] } });
      if (activeBooking) {
        activeBooking.room = room; // Populate dummy room for email template
        sendEmail(activeBooking.email, maintenanceReportEmail(activeBooking, args.issueDescription)).catch(() => { });
      }
    } catch (err) {
      console.error("Failed to send maintenance report email:", err);
    }

    return {
      success: true,
      message: `Issue for Room ${args.roomNumber} has been logged and reported to the maintenance staff.`,
      data: { roomNumber: args.roomNumber, timestamp }
    };
  },
  request_supplies: async (args, userId) => {
    const room = await Room.findOne({ roomNumber: args.roomNumber });
    if (!room) throw new Error(`Room ${args.roomNumber} not found.`);

    const timestamp = new Date().toLocaleString();
    const itemsList = args.items.map(i => `${i.quantity || 1}x ${i.name}`).join(", ");
    const supplyEntry = `\n[SUPPLIES REQUESTED ${timestamp}]: ${itemsList}${args.specialInstructions ? ` (Note: ${args.specialInstructions})` : ''}`;

    room.notes = (room.notes || "") + supplyEntry;
    await room.save();

    // 1. Log to Audit Log
    await logEvent({
      userId,
      action: 'SUPPLY_REQUEST',
      details: { roomNumber: args.roomNumber, items: args.items, instructions: args.specialInstructions, source: 'ai_assistant' }
    });

    // 2. Create/Update Support Thread for Housekeeping
    try {
      let thread = await ChatThread.findOne({ user: userId, type: 'support', status: 'open' });
      if (!thread) {
        thread = await ChatThread.create({
          user: userId,
          type: 'support',
          status: 'open',
          lastMessageAt: Date.now(),
          title: `Room ${args.roomNumber} Service Request`
        });
      } else {
        thread.lastMessageAt = Date.now();
        await thread.save();
      }

      await ChatMessage.create({
        thread: thread._id,
        sender: null,
        senderType: 'ai',
        content: `[SUPPLY REQUEST VIA AI]\nRoom: ${args.roomNumber}\nItems: ${itemsList}\nNote: ${args.specialInstructions || 'None'}\nTime: ${timestamp}`,
        type: 'action',
        metadata: { action: 'request_supplies', roomNumber: args.roomNumber, items: args.items }
      });
    } catch (err) {
      console.error("Failed to create support thread for supply request:", err);
    }

    try {
      const activeBooking = await Booking.findOne({ user: userId, room: room._id, status: { $in: ['confirmed', 'checked-in'] } });
      if (activeBooking) {
        activeBooking.room = room; // Populate dummy room for email template
        sendEmail(activeBooking.email, supplyRequestEmail(activeBooking, itemsList, args.specialInstructions)).catch(() => { });
      }
    } catch (err) {
      console.error("Failed to send supply request email:", err);
    }

    return {
      success: true,
      message: `Your request for ${itemsList} in Room ${args.roomNumber} has been sent to housekeeping.`,
      data: { roomNumber: args.roomNumber, items: args.items, timestamp }
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
    // Intelligent Defaults for non-technical users
    const checkIn = args.checkIn ? new Date(args.checkIn) : new Date();
    const checkOut = args.checkOut ? new Date(args.checkOut) : new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

    // 1. Base query for active AND ONLY completely vacant rooms
    // We do NOT show 'booked' or 'held' rooms in this list
    const query = { isActive: true, status: 'vacant' };

    if (args.type) query.type = args.type.toLowerCase();
    if (args.floor) query.floor = String(args.floor);
    if (args.block) query.block = args.block.toUpperCase();
    if (args.minRating) query.rating = { $gte: args.minRating };
    if (args.maxPrice) query.pricePerNight = { $lte: args.maxPrice };

    let rooms = await Room.find(query).sort({ rating: -1, pricePerNight: 1 });

    // 2. Fuzzy Search & Feature Filtering
    if (args.query || (args.facilities && args.facilities.length > 0)) {
      const searchTerms = [
        ...(args.query ? [args.query.toLowerCase()] : []),
        ...(args.facilities ? args.facilities.map(f => f.toLowerCase()) : [])
      ];

      rooms = rooms.filter(room => {
        const roomText = `${room.description} ${room.facilities?.join(' ')} ${room.type} Block ${room.block} Floor ${room.floor}`.toLowerCase();
        return searchTerms.every(term => roomText.includes(term));
      });
    }

    // 3. Filter by Date Availability (even if status is vacant, a future booking might exist)
    const availableRooms = [];
    for (const room of rooms) {
      const isAvailable = await Booking.checkRoomAvailability(room._id, checkIn, checkOut);
      if (isAvailable) {
        availableRooms.push(room);
      }
    }
    rooms = availableRooms;

    const maxResults = rooms.slice(0, 8);
    return maxResults.map(r => ({
      roomNumber: r.roomNumber,
      type: r.type,
      price: r.pricePerNight,
      location: `Floor ${r.floor}, Block ${r.block}`,
      facilities: r.facilities,
      rating: r.rating,
      description: r.description,
      primaryImage: r.images[0]?.url || (r.images[0]?.filename ? `/uploads/rooms/${r.images[0].filename}` : '')
    }));
  },
  get_my_profile: async (args, userId) => {
    const user = await User.findById(userId).select('-password');
    if (!user) throw new Error("User not found.");
    return {
      name: user.name,
      email: user.email,
      phone: user.phone || 'Not provided',
      role: user.role,
      joined: user.createdAt.toLocaleDateString()
    };
  },
  calculate_stay_quote: async (args) => {
    const room = await Room.findOne({ roomNumber: args.roomNumber });
    if (!room) throw new Error(`Room ${args.roomNumber} not found.`);

    const inDate = new Date(args.checkIn);
    const outDate = new Date(args.checkOut);
    const nights = Math.ceil((outDate - inDate) / (1000 * 60 * 60 * 24));

    if (nights <= 0) throw new Error("Stay must be at least one night.");

    return {
      roomNumber: room.roomNumber,
      type: room.type,
      pricePerNight: room.pricePerNight,
      totalNights: nights,
      totalAmount: nights * room.pricePerNight,
      dates: `${inDate.toLocaleDateString()} to ${outDate.toLocaleDateString()}`
    };
  },
  get_system_info: async () => {
    return {
      checkInTime: "12:00 PM",
      checkOutTime: "11:00 AM",
      receptionHours: "24/7",
      facilities: ["Gym (accessible 6 AM - 10 PM)", "Library", "Free Wi-Fi", "Student Cafeteria"],
      policy: "Cancellations allowed up to 24h before check-in. Valid ID required for all guests."
    };
  },
  create_booking: async (args, userId) => {
    const user = await User.findById(userId);
    if (!user) throw new Error("User account not found.");

    const baseRoom = await Room.findOne({ roomNumber: args.roomNumber });
    if (!baseRoom) throw new Error(`Room ${args.roomNumber} not found.`);

    // 1. Atomically acquire a lock on the room to handle parallel bookings gracefully
    // Just like the main booking flow, hold the room for 10 minutes to allow admin review/payment flow
    const room = await Room.acquireHold(baseRoom._id, userId, 10 * 60);
    if (!room) {
      throw new Error(`Room ${args.roomNumber} is currently locked or being booked by someone else. Please try another room.`);
    }

    try {
      getIO().of('/').emit('roomStatusUpdated', { roomId: room._id, status: 'held' });

      // Resolve relative dates like 'today', 'tomorrow', 'day after tomorrow'
      const resolveDate = (input) => {
        if (!input) return new Date(NaN);
        const lower = String(input).toLowerCase().trim();
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        if (lower === 'today' || lower === 'now') return new Date(todayStr);
        if (lower === 'tomorrow' || lower === 'tmrw') {
          const d = new Date(now); d.setDate(d.getDate() + 1); return new Date(d.toISOString().split('T')[0]);
        }
        if (lower.includes('day after tomorrow') || lower.includes('day after tmrw')) {
          const d = new Date(now); d.setDate(d.getDate() + 2); return new Date(d.toISOString().split('T')[0]);
        }
        // Try parsing as-is (YYYY-MM-DD or other formats)
        const parsed = new Date(input);
        return parsed;
      };

      const checkInDate = resolveDate(args.checkIn);
      const checkOutDate = resolveDate(args.checkOut);

      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        throw new Error("Invalid check-in or check-out date formats. Please use YYYY-MM-DD.");
      }

      const isAvailable = await Booking.checkRoomAvailability(room._id, checkInDate, checkOutDate);
      if (!isAvailable) {
        throw new Error(`Room ${room.roomNumber} is generally not available for the selected dates. Please check availability again.`);
      }

      const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
      if (nights <= 0) throw new Error("Check-out date must be after check-in date.");

      const totalAmount = nights * room.pricePerNight;

      const booking = new Booking({
        user: userId,
        room: room._id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guestName: args.guestName || user.name,
        email: args.email || user.email,
        phone: args.phone ? String(args.phone) : user.phone,
        purpose: args.purpose,
        numberOfGuests: args.numberOfGuests,
        specialRequests: args.specialRequests,
        totalAmount: totalAmount,
        status: 'pending',
        paymentMethod: 'cash',
        paymentStatus: 'unpaid'
      });

      await booking.save();

      // Emitting real-time updates
      try {
        getIO().of('/').emit('bookingUpdated', { bookingId: booking._id, status: 'pending' });
      } catch (e) { }

      await logEvent({
        userId,
        action: 'BOOKING_CREATE',
        details: { bookingId: booking._id, roomNumber: room.roomNumber, checkIn: args.checkIn, checkOut: args.checkOut, source: 'ai_assistant' }
      });

      // Send Pending Email
      await booking.populate('room', 'roomNumber type floor block pricePerNight');
      sendEmail(booking.email, bookingPendingEmail(booking)).catch(() => { });

      return {
        success: true,
        message: `Booking request received for Room ${room.roomNumber} from ${args.checkIn} to ${args.checkOut}. Total amount: ₹${totalAmount}. Your application is now PENDING staff approval. You will receive a confirmation email once approved.`,
        data: {
          bookingId: booking._id,
          roomNumber: room.roomNumber,
          totalAmount,
          status: 'pending'
        }
      };
    } catch (error) {
      await Room.releaseHold(room._id, userId);
      try { getIO().of('/').emit('roomStatusUpdated', { roomId: room._id, status: 'vacant' }); } catch { }
      throw error;
    }
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
      checkIn: b.checkIn.toISOString().split('T')[0],
      checkOut: b.checkOut.toISOString().split('T')[0],
      status: b.status,
      paymentStatus: b.paymentStatus,
      paymentMethod: b.paymentMethod,
      total: b.totalAmount
    }));
  },
  get_booking_details: async (args, userId) => {
    const booking = await Booking.findById(args.bookingId)
      .populate('room', 'roomNumber type floor block pricePerNight');

    if (!booking) throw new Error("Booking not found.");

    // Authorization
    if (booking.user.toString() !== userId.toString()) {
      throw new Error("You do not have permission to view this booking.");
    }

    return {
      id: booking._id,
      room: booking.room?.roomNumber,
      type: booking.room?.type,
      location: `Floor ${booking.room?.floor || 'N/A'} — Block ${booking.room?.block || 'N/A'}`,
      checkIn: booking.checkIn.toISOString().split('T')[0],
      checkOut: booking.checkOut.toISOString().split('T')[0],
      guestName: booking.guestName,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      paymentMethod: booking.paymentMethod,
      total: booking.totalAmount,
      purpose: booking.purpose,
      specialRequests: booking.specialRequests,
      checkedInAt: booking.checkedInAt,
      checkedOutAt: booking.checkedOutAt,
      notes: booking.notes,
      gatepass: booking.checkInToken ? "Available" : "Will be issued upon confirmation"
    };
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

    // Update room status if it was pending or confirmed
    if (['pending', 'confirmed'].includes(oldStatus)) {
      await Room.findByIdAndUpdate(booking.room, { status: 'vacant', holdBy: null, holdUntil: null });
      // Emit real-time status update to clear the held/booked state immediately on admin dash
      try { getIO().of('/').emit('roomStatusUpdated', { roomId: booking.room, status: 'vacant' }); } catch { }
    }

    try { getIO().of('/').emit('bookingUpdated', { bookingId: booking._id, status: 'cancelled' }); } catch { }

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
    if (!args.rating || args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5.");
    }

    let booking;

    // Strategy 1: Find by explicit booking ID
    if (args.bookingId) {
      booking = await Booking.findOne({ _id: args.bookingId, user: userId });
    }

    // Strategy 2: Find by room number (most recent completed/checked-out booking)
    if (!booking && args.roomNumber) {
      const room = await Room.findOne({ roomNumber: args.roomNumber });
      if (room) {
        booking = await Booking.findOne({
          user: userId,
          room: room._id,
          status: { $in: ['completed', 'checked-out', 'confirmed', 'checked-in'] }
        }).sort({ checkOut: -1 });
      }
    }

    // Strategy 3: Find the most recent booking for this user
    if (!booking) {
      booking = await Booking.findOne({
        user: userId,
        status: { $in: ['completed', 'checked-out', 'confirmed', 'checked-in'] }
      }).sort({ checkOut: -1 });
    }

    if (!booking) {
      throw new Error("No eligible booking found to submit feedback for. You need a confirmed, checked-in, or completed booking.");
    }

    let review = await Review.findOne({ booking: booking._id });
    const isUpdate = !!review;

    if (review) {
      review.rating = args.rating;
      if (args.comment) review.comment = args.comment;
      await review.save();
    } else {
      review = await Review.create({
        booking: booking._id,
        room: booking.room,
        user: userId,
        rating: args.rating,
        comment: args.comment || ''
      });
    }

    // Recalculate room average rating
    await Review.calculateAverageRating(booking.room);

    // Log the feedback event
    await logEvent({
      userId,
      action: 'FEEDBACK_SUBMIT',
      details: { bookingId: booking._id, rating: args.rating, isUpdate, source: 'ai_assistant' }
    });

    const roomData = await Room.findById(booking.room).select('roomNumber rating numReviews');

    return {
      success: true,
      message: isUpdate ? "Your feedback has been updated successfully." : "Thank you! Your feedback has been submitted successfully.",
      data: {
        bookingId: booking._id,
        roomNumber: roomData?.roomNumber,
        yourRating: args.rating,
        roomNewAverage: roomData?.rating,
        totalReviews: roomData?.numReviews,
        isUpdate
      }
    };
  },
  cancel_multiple_bookings: async (args, userId) => {
    const results = [];
    const errors = [];

    for (const id of args.bookingIds) {
      try {
        const booking = await Booking.findById(id);
        if (!booking) throw new Error(`Booking ${id} not found.`);
        if (booking.user.toString() !== userId.toString()) throw new Error(`Permission denied for ${id}.`);
        if (['cancelled', 'completed'].includes(booking.status)) throw new Error(`Booking ${id} is already ${booking.status}.`);
        if (booking.checkedInAt) throw new Error(`Booking ${id} is already checked-in.`);

        const oldStatus = booking.status;
        const reason = args.reason || 'Bulk Cancellation via Campus AI';

        await booking.cancel(reason, userId);

        if (['pending', 'confirmed'].includes(oldStatus)) {
          await Room.findByIdAndUpdate(booking.room, { status: 'vacant', holdBy: null, holdUntil: null });
          try { getIO().of('/').emit('roomStatusUpdated', { roomId: booking.room, status: 'vacant' }); } catch { }
        }

        try { getIO().of('/').emit('bookingUpdated', { bookingId: booking._id, status: 'cancelled' }); } catch { }

        await booking.populate('room', 'roomNumber');
        sendEmail(booking.email, bookingCancellationEmail(booking)).catch(() => { });

        await logEvent({
          userId,
          action: 'BOOKING_CANCEL_BULK',
          details: { bookingId: booking._id, reason, source: 'ai_assistant' }
        });

        results.push({ id: booking._id, room: booking.room?.roomNumber, success: true });
      } catch (err) {
        errors.push({ id: id, error: err.message });
      }
    }

    return {
      success: errors.length === 0,
      totalProcessed: args.bookingIds.length,
      successCount: results.length,
      errorCount: errors.length,
      results,
      errors
    };
  },
  extend_stay: async (args, userId) => {
    // --- 1. Find the booking (flexible: by ID, by room, or auto-detect) ---
    let booking;

    if (args.bookingId) {
      booking = await Booking.findById(args.bookingId).populate('room');
    }

    if (!booking && args.roomNumber) {
      const room = await Room.findOne({ roomNumber: args.roomNumber });
      if (room) {
        booking = await Booking.findOne({
          user: userId,
          room: room._id,
          status: { $in: ['confirmed', 'checked-in', 'pending'] }
        }).populate('room').sort({ checkOut: -1 });
      }
    }

    if (!booking) {
      booking = await Booking.findOne({
        user: userId,
        status: { $in: ['confirmed', 'checked-in', 'pending'] },
        checkOut: { $gte: new Date() }
      }).populate('room').sort({ checkIn: 1 });
    }

    if (!booking) {
      throw new Error("No active or upcoming booking found to extend. Please specify a booking ID or room number.");
    }

    // Authorization
    if (booking.user.toString() !== userId.toString()) {
      throw new Error("You do not have permission to modify this booking.");
    }

    if (['cancelled', 'completed'].includes(booking.status)) {
      throw new Error(`Cannot extend a ${booking.status} booking.`);
    }

    // --- 2. Calculate new checkout date ---
    const resolveDate = (input) => {
      if (!input) return null;
      const lower = String(input).toLowerCase().trim();
      const now = new Date();
      if (lower === 'today' || lower === 'now') return new Date(now.toISOString().split('T')[0]);
      if (lower === 'tomorrow' || lower === 'tmrw') {
        const d = new Date(now); d.setDate(d.getDate() + 1); return new Date(d.toISOString().split('T')[0]);
      }
      if (lower.includes('day after tomorrow')) {
        const d = new Date(now); d.setDate(d.getDate() + 2); return new Date(d.toISOString().split('T')[0]);
      }
      return new Date(input);
    };

    const oldCheckOut = new Date(booking.checkOut);
    let newCheckOut;

    if (args.newCheckOut) {
      newCheckOut = resolveDate(args.newCheckOut);
    } else if (args.additionalNights && args.additionalNights > 0) {
      newCheckOut = new Date(oldCheckOut);
      newCheckOut.setDate(newCheckOut.getDate() + Math.floor(args.additionalNights));
    } else {
      throw new Error("Please specify either the number of additional nights or a new checkout date.");
    }

    if (isNaN(newCheckOut.getTime())) {
      throw new Error("Invalid checkout date. Please use YYYY-MM-DD format.");
    }

    if (newCheckOut <= oldCheckOut) {
      throw new Error(`New checkout (${newCheckOut.toISOString().split('T')[0]}) must be after current checkout (${oldCheckOut.toISOString().split('T')[0]}). To shorten use modify_booking instead.`);
    }

    // --- 3. Check room availability for the extended period ---
    const isAvailable = await Booking.checkRoomAvailability(booking.room._id, oldCheckOut, newCheckOut, booking._id);
    if (!isAvailable) {
      // Suggest alternate dates
      const maxExtend = new Date(oldCheckOut);
      for (let i = 1; i <= 14; i++) {
        const testDate = new Date(oldCheckOut);
        testDate.setDate(testDate.getDate() + i);
        const avail = await Booking.checkRoomAvailability(booking.room._id, oldCheckOut, testDate, booking._id);
        if (!avail) {
          maxExtend.setDate(oldCheckOut.getDate() + i - 1);
          break;
        }
        if (i === 14) maxExtend.setDate(oldCheckOut.getDate() + 14);
      }
      const maxNights = Math.ceil((maxExtend - oldCheckOut) / (1000 * 60 * 60 * 24));
      throw new Error(`Room ${booking.room.roomNumber} is not available for the full extension. Maximum available extension: ${maxNights} night(s) until ${maxExtend.toISOString().split('T')[0]}.`);
    }

    // --- 4. Calculate pricing ---
    const oldNights = Math.ceil((oldCheckOut - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24));
    const newNights = Math.ceil((newCheckOut - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24));
    const addedNights = newNights - oldNights;
    const pricePerNight = booking.room.pricePerNight;
    const additionalCost = addedNights * pricePerNight;
    const oldTotal = booking.totalAmount;
    const newTotal = newNights * pricePerNight;

    // --- 5. Apply changes ---
    booking.checkOut = newCheckOut;
    booking.totalAmount = newTotal;
    await booking.save();

    // Real-time update
    try {
      getIO().of('/').emit('bookingUpdated', { bookingId: booking._id, status: booking.status });
    } catch (e) { }

    // Audit log
    await logEvent({
      userId,
      action: 'BOOKING_EXTEND',
      details: {
        bookingId: booking._id,
        roomNumber: booking.room.roomNumber,
        oldCheckOut: oldCheckOut.toISOString().split('T')[0],
        newCheckOut: newCheckOut.toISOString().split('T')[0],
        addedNights,
        additionalCost,
        source: 'ai_assistant'
      }
    });

    // Send update email
    sendEmail(booking.email, bookingUpdateEmail(booking, ['checkOut', 'totalAmount'], additionalCost)).catch(() => { });

    return {
      success: true,
      message: `Stay extended successfully! Added ${addedNights} night(s). New checkout: ${newCheckOut.toISOString().split('T')[0]}.`,
      data: {
        bookingId: booking._id,
        roomNumber: booking.room.roomNumber,
        oldCheckOut: oldCheckOut.toISOString().split('T')[0],
        newCheckOut: newCheckOut.toISOString().split('T')[0],
        addedNights,
        pricePerNight,
        additionalCost,
        oldTotal,
        newTotal,
        totalNights: newNights
      }
    };
  },
  get_booking_invoice: async (args, userId) => {
    // --- 1. Find the booking (flexible) ---
    let booking;

    if (args.bookingId) {
      booking = await Booking.findById(args.bookingId)
        .populate('room', 'roomNumber type floor block pricePerNight facilities')
        .populate('user', 'name email phone');
    }

    if (!booking && args.roomNumber) {
      const room = await Room.findOne({ roomNumber: args.roomNumber });
      if (room) {
        booking = await Booking.findOne({
          user: userId,
          room: room._id
        }).populate('room', 'roomNumber type floor block pricePerNight facilities')
          .populate('user', 'name email phone')
          .sort({ createdAt: -1 });
      }
    }

    if (!booking) {
      booking = await Booking.findOne({ user: userId })
        .populate('room', 'roomNumber type floor block pricePerNight facilities')
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 });
    }

    if (!booking) {
      throw new Error("No booking found to generate invoice for.");
    }

    // Authorization
    if (booking.user._id.toString() !== userId.toString()) {
      throw new Error("You do not have permission to view this invoice.");
    }

    // --- 2. Calculate invoice breakdown ---
    const nights = Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24));
    const pricePerNight = booking.room?.pricePerNight || 0;
    const subtotal = nights * pricePerNight;

    return {
      success: true,
      message: "Invoice generated successfully.",
      data: {
        invoiceNumber: `NFSU-INV-${booking._id.toString().slice(-8).toUpperCase()}`,
        bookingId: booking._id,
        generatedAt: new Date().toISOString(),

        // Guest Details
        guest: {
          name: booking.guestName,
          email: booking.email,
          phone: booking.phone,
          purpose: booking.purpose
        },

        // Room Details
        room: {
          number: booking.room?.roomNumber,
          type: booking.room?.type,
          floor: booking.room?.floor,
          block: booking.room?.block,
          facilities: booking.room?.facilities
        },

        // Stay Details
        stay: {
          checkIn: new Date(booking.checkIn).toISOString().split('T')[0],
          checkOut: new Date(booking.checkOut).toISOString().split('T')[0],
          totalNights: nights,
          numberOfGuests: booking.numberOfGuests
        },

        // Billing
        billing: {
          pricePerNight,
          subtotal,
          totalAmount: booking.totalAmount,
          paymentStatus: booking.paymentStatus,
          paymentMethod: booking.paymentMethod
        },

        // Status
        bookingStatus: booking.status,
        specialRequests: booking.specialRequests || 'None',

        // Download link
        downloadUrl: `/api/bookings/${booking._id}/invoice`,
        note: "Use the download URL to get the official PDF invoice. This can be used for reimbursement and official records."
      }
    };
  },
  compare_rooms: async (args) => {
    if (!args.roomNumbers || args.roomNumbers.length < 2) {
      throw new Error("Please provide at least 2 room numbers to compare.");
    }
    if (args.roomNumbers.length > 5) {
      throw new Error("Maximum 5 rooms can be compared at once.");
    }

    const rooms = await Room.find({
      roomNumber: { $in: args.roomNumbers },
      isActive: true
    });

    if (rooms.length === 0) {
      throw new Error(`None of the rooms (${args.roomNumbers.join(', ')}) were found.`);
    }

    const notFound = args.roomNumbers.filter(rn => !rooms.find(r => r.roomNumber === rn));

    // Get reviews for each room
    const roomReviews = await Review.aggregate([
      { $match: { room: { $in: rooms.map(r => r._id) } } },
      { $group: { _id: '$room', avgRating: { $avg: '$rating' }, count: { $sum: 1 }, latestComment: { $last: '$comment' } } }
    ]);

    // Check availability if dates are provided
    let availabilityMap = {};
    let stayNights = null;
    if (args.checkIn && args.checkOut) {
      const checkIn = new Date(args.checkIn);
      const checkOut = new Date(args.checkOut);
      stayNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

      for (const room of rooms) {
        const isAvailable = await Booking.checkRoomAvailability(room._id, checkIn, checkOut);
        availabilityMap[room._id.toString()] = isAvailable;
      }
    }

    const comparison = rooms.map(room => {
      const reviewData = roomReviews.find(r => r._id.toString() === room._id.toString());
      const available = availabilityMap[room._id.toString()];

      return {
        roomNumber: room.roomNumber,
        type: room.type,
        pricePerNight: room.pricePerNight,
        totalForStay: stayNights ? room.pricePerNight * stayNights : null,
        floor: room.floor,
        block: room.block,
        location: `Floor ${room.floor}, Block ${room.block}`,
        facilities: room.facilities || [],
        amenities: (room.amenities || []).filter(a => a.available).map(a => a.name),
        rating: room.rating || 0,
        numReviews: reviewData?.count || room.numReviews || 0,
        latestReview: reviewData?.latestComment || null,
        description: room.description || 'No description available',
        status: room.status,
        available: available !== undefined ? available : (room.status === 'vacant'),
        primaryImage: room.images?.find(img => img.isPrimary)?.url || room.images?.[0]?.url || null
      };
    });

    // Sort by rating (highest first), then price (lowest first)
    comparison.sort((a, b) => b.rating - a.rating || a.pricePerNight - b.pricePerNight);

    // Generate recommendation
    const availableRooms = comparison.filter(r => r.available);
    let recommendation = null;
    if (availableRooms.length > 0) {
      const best = availableRooms[0];
      recommendation = `Room ${best.roomNumber} is recommended — ${best.type}, ₹${best.pricePerNight}/night, rated ${best.rating}★ with ${best.numReviews} reviews.`;
    }

    return {
      success: true,
      totalCompared: comparison.length,
      stayNights,
      dateRange: args.checkIn && args.checkOut ? `${args.checkIn} to ${args.checkOut}` : null,
      rooms: comparison,
      notFound: notFound.length > 0 ? notFound : undefined,
      recommendation
    };
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
      content: `You are the NFSU Campus AI Assistant, a friendly, intelligent, and proactive guide for guests of the National Forensic Sciences University campus guest house. Your mission is to make their stay effortless.

══════════════════════════════════════════
📅 CURRENT DATE & TIME
══════════════════════════════════════════
Today: ${new Date().toISOString().split('T')[0]} (${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })})
Tomorrow: ${(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()}
Day after tomorrow: ${(() => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().split('T')[0]; })()}

══════════════════════════════════════════
🧠 MEMORY & CONTEXT INTELLIGENCE
══════════════════════════════════════════
- ALWAYS remember ALL information the user provided earlier in the conversation. NEVER re-ask for anything already stated.
- If the user said their room number, dates, or purpose before — USE IT from memory. Do NOT ask again.
- When the user provides multiple details in one message, extract ALL of them at once.
- If the user refers to "my room" or "my booking", auto-detect from their profile or recent bookings.
- Track the flow: if the user just searched rooms and says "book the first one", use that room number from context.

══════════════════════════════════════════
📆 DATE HANDLING (CRITICAL)
══════════════════════════════════════════
- ALWAYS convert relative dates to YYYY-MM-DD format BEFORE calling any tool.
- "today" → ${new Date().toISOString().split('T')[0]}
- "tomorrow" → ${(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()}
- "day after tomorrow" → ${(() => { const d = new Date(); d.setDate(d.getDate() + 2); return d.toISOString().split('T')[0]; })()}
- "next Monday", "this weekend", "in 3 days" → calculate the exact YYYY-MM-DD date.
- NEVER pass strings like "today" or "tomorrow" as tool arguments. Always resolve first.

══════════════════════════════════════════
🗣️ NATURAL LANGUAGE UNDERSTANDING
══════════════════════════════════════════
- "me only" / "just me" / "solo" → numberOfGuests = 1
- "with my wife" / "couple" → numberOfGuests = 2
- "family of 4" → numberOfGuests = 4
- "retrieve bonafide" / "exam" / "workshop" → purpose = "academic"
- "conference" / "meeting" / "official visit" → purpose = "business"
- "vacation" / "personal visit" / "family visit" → purpose = "personal"
- "amazing" / "excellent" / "loved it" → rating = 5
- "good" / "nice" / "satisfied" → rating = 4
- "okay" / "average" / "fine" → rating = 3
- "bad" / "poor" / "not good" → rating = 2
- "terrible" / "worst" / "horrible" → rating = 1
- Do NOT ask for name, email, or phone — the backend auto-fills from their secure profile.

══════════════════════════════════════════
🔧 TOOL USAGE GUIDE
══════════════════════════════════════════
ROOMS & BOOKING:
- 'get_available_rooms' → search/filter rooms by dates, type, price, block, floor, amenities, or fuzzy queries like "quiet room near gym"
- 'get_room_details' → deep-dive into a specific room's amenities, images, description
- 'calculate_stay_quote' → price calculator without booking
- 'create_booking' → ALWAYS check availability first via get_available_rooms
- BOOKING FLOW: Search → Show options → User picks → Create booking. Minimize questions.

MANAGEMENT:
- 'get_my_bookings' → list all or filtered bookings (by status, upcoming only)
- 'get_booking_details' → detailed status of one booking
- 'modify_booking' → update dates, guest details, purpose, etc.
- 'extend_stay' → add extra nights or set a new checkout date. Auto-finds active booking. E.g., "stay 2 more nights" or "extend until Friday"
- 'cancel_booking' → cancel a single booking (ask for confirmation first)
- 'cancel_multiple_bookings' → bulk cancel (ALWAYS show bookings first, then confirm)
- 'get_booking_invoice' → retrieve a detailed invoice/receipt with billing breakdown and PDF download link. Works by bookingId or roomNumber.
- 'compare_rooms' → compare 2-5 rooms side-by-side with pricing, facilities, ratings, and optional date-based availability check

SERVICES:
- 'request_supplies' → towels, pillows, water, toiletries, room service items. Auto-detect room if possible.
- 'report_room_issue' → maintenance, cleanliness, broken items, noise complaints
- 'submit_feedback' → ratings and reviews. Works by bookingId OR roomNumber (auto-finds latest booking). Can update existing reviews.

INFORMATION:
- 'get_my_profile' → user identity, role, contact info
- 'get_my_gatepass' → QR code and check-in token for entry
- 'get_system_info' → check-in/out times, facilities, campus policies
- 'find_faq' → search knowledge base for policies, rules, and common questions
- 'escalate_to_staff' → LAST RESORT when AI can't help, or user explicitly asks for human

══════════════════════════════════════════
💡 BEHAVIORAL RULES
══════════════════════════════════════════
1. BE PROACTIVE: If the user's intent is clear, act immediately. Don't ask unnecessary clarifying questions.
2. BE SMART: If a user says "cancel all my bookings", first fetch their bookings, show them the list, then ask for confirmation before bulk cancelling.
3. CURRENCY: ONLY use ₹ (Indian Rupees). NEVER use $ or USD.
4. ERRORS: If something fails, explain what went wrong clearly and suggest alternatives.
5. FEEDBACK: When the user wants to rate, be flexible — let them just say "5 stars for room 101" and handle everything.
6. SUPPLIES: Parse items naturally — "I need 2 towels and some soap" → [{name:"Towel", quantity:2}, {name:"Soap", quantity:1}]
7. EXTEND: "2 more nights" → use extend_stay with additionalNights=2. "extend until March 15" → use newCheckOut.
8. INVOICE: When user asks for bill/receipt/invoice, use get_booking_invoice. Include the download URL in your response.
9. COMPARE: When user says "compare" or "which is better", use compare_rooms. Share the recommendation.
10. TONE: Be concise, warm, and professional. The user is a guest — treat them like one.
11. NEVER fabricate data. Only respond with information retrieved from tools.`
    },
    ...history.map(h => ({
      role: h.senderType === 'user' ? 'user' : 'assistant',
      content: h.content || ""
    })),
    { role: "user", content: message }
  ];

  const models = [

    "google/gemini-2.0-flash-lite-001",
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.3-70b-instruct",
    "qwen/qwen-2.5-72b-instruct",
    "openrouter/free",

    // Tier 3: Massive Context Providers (Best for analyzing huge documents)
    "qwen/qwen3-coder:free", // 262,000
    "stepfun/step-3.5-flash:free", // 256,000
    "nvidia/nemotron-3-nano-30b-a3b:free", // 256,000
    "openrouter/free", // 200,000 (Router)

    // Tier 4: Heavyweight & Flagship Models
    "qwen/qwen3-next-80b-a3b-instruct:free", // 262,144 (Often rate limited)
    "nousresearch/hermes-3-llama-3.1-405b:free", // 131,072 (Slowest but smartest)
    "openai/gpt-oss-120b:free", // 131,072
    "arcee-ai/trinity-large-preview:free", // 131,000

    // Tier 2: The "Sweet Spot" (Balance of Intelligence & Speed)
    "google/gemma-3-27b-it:free", // 131,072
    "meta-llama/llama-3.2-3b-instruct:free", // 131,072
    "meta-llama/llama-3.3-70b-instruct:free", // 128,000
    "z-ai/glm-4.5-air:free", // 131,072
    "openai/gpt-oss-20b:free", // 131,072
    "arcee-ai/trinity-mini:free", // 131,072
    "nvidia/nemotron-nano-12b-v2-vl:free", // 128,000
    "nvidia/nemotron-nano-9b-v2:free", // 128,000
    "mistralai/mistral-small-3.1-24b-instruct:free", // 128,000
    "qwen/qwen3-vl-30b-a3b-thinking:free", // 131,072
    "qwen/qwen3-vl-235b-a22b-thinking:free", // 131,072

    // Tier 1: Fastest Response Times
    "qwen/qwen3-4b:free", // 40,960
    "liquid/lfm-2.5-1.2b-thinking:free", // 32,768
    "liquid/lfm-2.5-1.2b-instruct:free", // 32,768
    "cognitivecomputations/dolphin-mistral-24b-venice-edition:free", // 32,768
    "google/gemma-3-12b-it:free", // 32,768
    "google/gemma-3-4b-it:free", // 32,768
    "google/gemma-3n-e4b-it:free", // 8,192
    "google/gemma-3n-e2b-it:free" // 8,192
  ];

  const callOpenRouter = async (currentMessages, currentTools = null, modelIndex = 0) => {
    if (modelIndex >= models.length) {
      throw new Error("All AI models are currently unavailable. Please try again in a few moments.");
    }

    const model = models[modelIndex];
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
          model,
          messages: currentMessages,
          ...(currentTools ? { tools: currentTools, tool_choice: "auto" } : {})
        })
      });

      const data = await response.json();
      if (!response.ok) {
        console.warn(`Model ${model} failed (${response.status}). Trying next fallback...`);
        return callOpenRouter(currentMessages, currentTools, modelIndex + 1);
      }
      return { data, model };
    } catch (err) {
      console.warn(`Error with model ${model}. Trying next fallback...`, err.message);
      return callOpenRouter(currentMessages, currentTools, modelIndex + 1);
    }
  };

  try {
    const { data, model: activeModel } = await callOpenRouter(messages, tools);
    let aiMessage = data.choices[0].message;
    let content = aiMessage.content || "";

    // FALLBACK: Handle XML-style tool calls
    if (!aiMessage.tool_calls && content.includes("<tool_call>")) {
      try {
        const toolMatch = content.match(/<tool_call>(.*?)\s+(?:<arg_key>(.*?)<\/arg_key>\s*<arg_value>(.*?)<\/arg_value>\s*)*<\/tool_call>/is);
        if (toolMatch) {
          const name = toolMatch[1].trim();
          const args = {};

          const argRegex = /<arg_key>(.*?)<\/arg_key>\s*<arg_value>(.*?)<\/arg_value>/g;
          let argMatch;
          while ((argMatch = argRegex.exec(content)) !== null) {
            let val = argMatch[2];
            if (val.toLowerCase() === 'true') val = true;
            else if (val.toLowerCase() === 'false') val = false;
            else if (!isNaN(val)) val = Number(val);
            args[argMatch[1]] = val;
          }

          const toolFn = toolImplementations[name];
          if (toolFn) {
            let toolResult;
            try {
              toolResult = await toolFn(args, userId);
            } catch (tErr) {
              toolResult = { error: tErr.message };
            }

            messages.push({ role: "assistant", content: content });
            messages.push({
              role: "tool",
              tool_call_id: "manual_" + Date.now(),
              name: name,
              content: JSON.stringify(toolResult)
            });

            // Follow-up with fallback support
            const { data: finalData } = await callOpenRouter(messages);

            if (!finalData.choices?.[0]) {
              return {
                text: `Success with ${name}, but follow-up failed.`,
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
        let sanitized = argsString.replace(/```json/g, "").replace(/```/g, "").trim();
        sanitized = sanitized.replace(/,(\s*[\]}])/g, "$1");
        args = JSON.parse(sanitized);
      } catch (parseError) {
        throw new Error("Formatting error in tool request. Please try again.");
      }

      const toolFn = toolImplementations[name];
      if (toolFn) {
        let toolResult;
        try {
          toolResult = await toolFn(args, userId);
        } catch (tErr) {
          toolResult = { error: tErr.message };
        }

        messages.push(aiMessage);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: name,
          content: JSON.stringify(toolResult)
        });

        // Follow-up with fallback support
        const { data: finalData } = await callOpenRouter(messages);

        if (!finalData.choices?.[0]) {
          return {
            text: `The action was completed, but I couldn't summarize the result.`,
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
