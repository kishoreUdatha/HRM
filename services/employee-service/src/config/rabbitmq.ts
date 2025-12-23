import amqp, { Channel, ChannelModel } from 'amqplib';

let channel: Channel | null = null;
let connection: ChannelModel | null = null;

export async function connectRabbitMQ(): Promise<void> {
  try {
    const conn = await amqp.connect(
      process.env.RABBITMQ_URL || 'amqp://localhost:5672'
    );
    connection = conn;
    const ch = await conn.createChannel();
    channel = ch;

    // Declare exchanges for employee events
    await ch.assertExchange('employee_events', 'topic', { durable: true });

    console.log('[Employee Service] Connected to RabbitMQ');
  } catch (error) {
    console.error('[Employee Service] RabbitMQ connection error:', error);
    setTimeout(connectRabbitMQ, 5000);
  }
}

export async function publishEvent(
  routingKey: string,
  message: Record<string, unknown>
): Promise<boolean> {
  try {
    if (!channel) {
      console.error('[Employee Service] RabbitMQ channel not available');
      return false;
    }

    channel.publish(
      'employee_events',
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );

    console.log(`[Employee Service] Published event: ${routingKey}`);
    return true;
  } catch (error) {
    console.error('[Employee Service] Error publishing event:', error);
    return false;
  }
}

export function getChannel(): Channel | null {
  return channel;
}

export async function closeConnection(): Promise<void> {
  try {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
  } catch (error) {
    console.error('[Employee Service] Error closing RabbitMQ connection:', error);
  }
}
