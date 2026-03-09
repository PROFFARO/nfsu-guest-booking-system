import Room from "../models/Room.js";
import Booking from "../models/Booking.js";
import Review from "../models/Review.js";
import FAQ from "../models/FAQ.js";
import ChatThread from "../models/ChatThread.js";
import ChatMessage from "../models/ChatMessage.js";
import AuditLog from "../models/AuditLog.js";
import { sendEmail, bookingCancellationEmail, bookingPendingEmail, bookingUpdateEmail, maintenanceReportEmail, supplyRequestEmail, bookingConfirmationEmail, gatepassEmail, invoiceEmail } from '../services/emailService.js';
import { generateInvoicePDFBuffer } from '../services/invoiceService.js';
import { logEvent } from '../utils/auditLogger.js';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { getIO } from '../realtime/socket.js';

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
      description: "Modify any details of an existing booking (Dates, Guest Name, Purpose, Guests, Special Requests)",
      parameters: {
        type: "object",
        properties: {
          bookingId: { type: "string", description: "The ID of the booking to modify" },
          newCheckIn: { type: "string", description: "New check-in date (ISO format)" },
          newCheckOut: { type: "string", description: "New check-out date (ISO format)" },
          guestName: { type: "string", description: "Update guest name" },
          email: { type: "string", description: "Update contact email" },
          phone: { type: "string", description: "Update 10-digit phone number" },
          purpose: { type: "string", enum: ["academic", "business", "personal", "other"], description: "Update category of visit" },
          purposeDetails: { type: "string", description: "Update specific reason/details for stay" },
          numberOfGuests: { type: "number", minimum: 1, maximum: 4, description: "Update number of occupants" },
          specialRequests: { type: "string", description: "Update special instructions" }
        },
        required: ["bookingId"]
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
      description: "Get a list of available rooms based on dates, type, budget, floor, and facilities",
      parameters: {
        type: "object",
        properties: {
          checkIn: { type: "string", description: "Desired check-in date (YYYY-MM-DD)" },
          checkOut: { type: "string", description: "Desired check-out date (YYYY-MM-DD)" },
          type: { type: "string", enum: ["single", "double"], description: "Room type" },
          floor: { type: "string", description: "Desired floor number (1-6)" },
          block: { type: "string", enum: ["A", "B", "C", "D", "E", "F"], description: "Block letter" },
          minPrice: { type: "number", description: "Minimum price per night" },
          maxPrice: { type: "number", description: "Maximum price per night (budget)" },
          facilities: {
            type: "array",
            items: { type: "string" },
            description: "List of required facilities (e.g. Gym, AC, WiFi)"
          },
          minRating: { type: "number", description: "Minimum star rating (0-5)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_booking",
      description: "Create a new confirmed room booking for the user.",
      parameters: {
        type: "object",
        properties: {
          roomNumber: { type: "string", description: "The specific room number to book (e.g. 101, A-205)" },
          checkIn: { type: "string", description: "Check-in date (YYYY-MM-DD)" },
          checkOut: { type: "string", description: "Check-out date (YYYY-MM-DD)" },
          guestName: { type: "string", description: "Name of the guest (leave empty to use account name)" },
          email: { type: "string", description: "Contact email (leave empty to use account email)" },
          phone: { type: "string", description: "Contact phone 10-digits (leave empty to use account phone)" },
          purpose: { type: "string", enum: ["academic", "business", "personal", "other"], description: "Purpose of visit" },
          numberOfGuests: { type: "number", minimum: 1, maximum: 4, description: "Number of guests staying" },
          specialRequests: { type: "string", description: "Any special instructions or requests" }
        },
        required: ["roomNumber", "checkIn", "checkOut", "purpose", "numberOfGuests"]
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
      name: "get_booking_details",
      description: "Get full details of a specific booking including payment status, guests, purpose, and administrative notes",
      parameters: {
        type: "object",
        properties: {
          bookingId: { type: "string", description: "The ID of the booking to retrieve" }
        },
        required: ["bookingId"]
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
  },
  {
    type: "function",
    function: {
      name: "cancel_multiple_bookings",
      description: "Cancel multiple bookings at once by their IDs",
      parameters: {
        type: "object",
        properties: {
          bookingIds: {
            type: "array",
            items: { type: "string" },
            description: "List of booking IDs to cancel"
          },
          reason: { type: "string", description: "Common reason for these cancellations (optional)" }
        },
        required: ["bookingIds"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "request_supplies",
      description: "Request room supplies or hospitality services (e.g. towels, water, toiletries, bedding). Use this when a guest wants extra items delivered to their room.",
      parameters: {
        type: "object",
        properties: {
          roomNumber: { type: "string", description: "The room number for the request" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Name of the item (e.g. Towel, Water Bottle)" },
                quantity: { type: "number", description: "Number of items requested" }
              },
              required: ["name"]
            },
            description: "List of items and their quantities"
          },
          specialInstructions: { type: "string", description: "Any specific instructions for the housekeeping staff" }
        },
        required: ["roomNumber", "items"]
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
      newIn = args.newCheckIn ? new Date(args.newCheckIn) : booking.checkIn;
      newOut = args.newCheckOut ? new Date(args.newCheckOut) : booking.checkOut;

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
    // 1. Base query for active, non-maintenance rooms
    const query = { isActive: true, status: { $ne: 'maintenance' } };

    if (args.type) query.type = args.type.toLowerCase();
    if (args.floor) query.floor = String(args.floor);
    if (args.block) query.block = args.block.toUpperCase();
    if (args.minRating) query.rating = { $gte: args.minRating };

    // Price filtering
    if (args.minPrice || args.maxPrice) {
      query.pricePerNight = {};
      if (args.minPrice) query.pricePerNight.$gte = args.minPrice;
      if (args.maxPrice) query.pricePerNight.$lte = args.maxPrice;
    }

    let rooms = await Room.find(query).sort({ rating: -1, pricePerNight: 1 });

    // 2. Fuzzy facility filtering (Case-insensitive)
    if (args.facilities && args.facilities.length > 0) {
      rooms = rooms.filter(room => {
        const roomFacs = (room.facilities || []).map(f => f.toLowerCase());
        return args.facilities.every(reqFac =>
          roomFacs.some(f => f.includes(reqFac.toLowerCase()))
        );
      });
    }

    // 3. Filter by Date Availability if provided
    if (args.checkIn && args.checkOut) {
      const checkInDate = new Date(args.checkIn);
      const checkOutDate = new Date(args.checkOut);

      if (!isNaN(checkInDate.getTime()) && !isNaN(checkOutDate.getTime())) {
        const availableRooms = [];
        for (const room of rooms) {
          // Check if there are ANY conflicting bookings for this specific room
          const isAvailable = await Booking.checkRoomAvailability(room._id, checkInDate, checkOutDate);

          if (isAvailable && room.status !== 'held') {
            availableRooms.push(room);
          } else if (isAvailable && room.status === 'held') {
            // If it's held but the hold has expired
            if (room.holdUntil && new Date() > room.holdUntil) {
              availableRooms.push(room);
            }
          }
        }
        rooms = availableRooms;
      }
    } else {
      // If no dates provided, only return fully vacant currently
      rooms = rooms.filter(r => r.status === 'vacant');
    }

    const maxResults = rooms.slice(0, 10);
    return maxResults.map(r => ({
      roomNumber: r.roomNumber,
      type: r.type,
      price: r.pricePerNight,
      floor: r.floor,
      block: r.block,
      facilities: r.facilities,
      rating: r.rating
    }));
  },
  create_booking: async (args, userId) => {
    const { default: User } = await import('../models/User.js');
    const user = await User.findById(userId);
    if (!user) throw new Error("User account not found.");

    const room = await Room.findOne({ roomNumber: args.roomNumber });
    if (!room) throw new Error(`Room ${args.roomNumber} not found.`);

    const checkInDate = new Date(args.checkIn);
    const checkOutDate = new Date(args.checkOut);

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
    // In AI flow, we keep room status as is (will be considered booked/unavailable via overlap check)
    // or we could mark as 'held' to be safe visually.
    try { getIO().of('/').emit('roomStatusUpdated', { roomId: room._id, status: 'held' }); } catch { }

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

        if (oldStatus === 'confirmed') {
          await Room.findByIdAndUpdate(booking.room, { status: 'vacant', holdBy: null, holdUntil: null });
        }

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
      content: "You are the NFSU Campus AI Assistant. Use the provided tools. To search for available rooms using 'get_available_rooms' you MUST ask the user for their check-in and check-out dates if they have not provided any, otherwise the search will only return rooms that are completely vacant right now. If a user tries to create a booking, ALWAYS understand their dates and preferences, list options via 'get_available_rooms', ask them to pick a room, and FINALLY call 'create_booking'. For checking booking status, ALWAYS first call 'get_my_bookings' to show a summary list, then ask the user to select which one they want to see, and finally call 'get_booking_details' to show full status details. If reporting issues, use 'report_room_issue'. For asking supplies, use 'request_supplies'. To cancel, use 'get_my_bookings' then 'cancel_booking'. Be concise."
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
