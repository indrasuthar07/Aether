import mongoose, { type Document, type Model } from 'mongoose';

export interface ISession extends Document {
  code: string;
  agentConnectedAt: Date;
  viewerConnectedAt?: Date;
  endedAt?: Date;
  durationSeconds?: number;
}
const SessionSchema = new mongoose.Schema<ISession>({
  code: { type: String, required: true, index: true },
  agentConnectedAt: { type: Date, required: true, default: Date.now },
  viewerConnectedAt: { type: Date },
  endedAt: { type: Date },
  durationSeconds: { type: Number }
});

export const Session: Model<ISession> = mongoose.model<ISession>('Session', SessionSchema);