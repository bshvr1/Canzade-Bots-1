import { Schema, Document, model } from "mongoose";

export interface IChannelModel extends Document {
    userID: string;
    guildID: string;
    channelID: string;
    type: "text" | "voice";
    data: number;
}

export const ChannelSchema = new Schema({
    userID: {
        type: String,
        required: true
    },
    guildID: {
        type: String,
        required: true
    },
    channelID: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
    },
    data: {
        type: Number,
        required: true,
        default: 0
    },
});

export const ChannelModel = model<IChannelModel>("ChannelModel", ChannelSchema, "CHANNEL_COLLECTION");
