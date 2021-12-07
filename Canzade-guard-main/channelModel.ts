import { Document, model, Schema } from "mongoose";

export interface IChannelData {
	channelID: string;
	allow: number;
	deny: number;
	dataID: string;
	type: string;
}

export interface IChannelModel extends Document, IChannelData {}

export const ChannelSchema = new Schema({
	channelID: {
		type: String,
		required: true,
	},
	allow: {
		type: Number,
		required: true,
	},
	deny: {
		type: Number,
		required: true,
	},
	dataID: {
		type: String,
		required: true,
	},
	type: {
		type: String,
		required: true,
	},
});

export const ChannelModel = model<IChannelModel>(
	"ChannelModel",
	ChannelSchema,
	"CHANNEL_COLLECTION",
);
