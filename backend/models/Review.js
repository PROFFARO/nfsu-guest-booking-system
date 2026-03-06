import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
    booking: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: [true, 'Review must belong to a specific booking']
    },
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        required: [true, 'Review must be associated with a room']
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Review must have an author']
    },
    rating: {
        type: Number,
        required: [true, 'Please provide a rating'],
        min: [1, 'Rating must be at least 1 star'],
        max: [5, 'Rating cannot be more than 5 stars']
    },
    comment: {
        type: String,
        maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Prevent duplicate reviews: 1 review per booking
reviewSchema.index({ booking: 1 }, { unique: true });

// Static method to calculate average rating for a room
reviewSchema.statics.calculateAverageRating = async function (roomId) {
    const obj = await this.aggregate([
        {
            $match: { room: roomId }
        },
        {
            $group: {
                _id: '$room',
                avgRating: { $avg: '$rating' },
                numReviews: { $sum: 1 }
            }
        }
    ]);

    try {
        await mongoose.model('Room').findByIdAndUpdate(roomId, {
            rating: obj[0]?.avgRating ? Math.round(obj[0].avgRating * 10) / 10 : 0,
            numReviews: obj[0]?.numReviews || 0
        });
    } catch (err) {
        console.error('Error calculating average room rating:', err);
    }
};

// Call calculateAverageRating after saving a review
reviewSchema.post('save', function () {
    this.constructor.calculateAverageRating(this.room);
});

// Call calculateAverageRating before removing a review (if admin deletes one)
reviewSchema.pre('remove', function () {
    this.constructor.calculateAverageRating(this.room);
});

export default mongoose.model('Review', reviewSchema);
