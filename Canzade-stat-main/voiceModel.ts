import { Schema, Document, model } from "mongoose";

export interface IVoiceModel extends Document {
    userID: string;
    guildID: string;
    messages: number;
    voice: number;
}

export const VoiceSchema = new Schema({
    userID: {
        type: String,
        required: true
    },
    guildID: {
        type: String,
        required: true
    },
    messages: {
        type: Number,
        required: true,
        default: 0
    },
    voice: {
        type: Number,
        required: true,
        default: 0
    },
});

export const VoiceModel = model<IVoiceModel>("VoiceModel", VoiceSchema, "VOICE_COLLECTION");
