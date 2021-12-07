import { Document, model, Schema } from "mongoose";

export interface IRoleData {
	roleID: string;
	permissions: number;
}

export interface IRoleModel extends Document, IRoleData {}

export const RoleSchema = new Schema({
	roleID: {
		type: String,
		required: true,
	},
	permissions: {
		type: Number,
		required: true,
	},
});

export const RoleModel = model<IRoleModel>(
	"RoleModel",
	RoleSchema,
	"ROLE_COLLECTION",
);
