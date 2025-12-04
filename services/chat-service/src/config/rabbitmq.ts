import amqp, { Channel, Connection } from 'amqplib';

let channel: Channel | null = null;
let connection: Connection | null = null;

export async function connectRabbitMQ(): Promise<void> {
  try {
    connection = await amqp.connect(
      process.env.RABBITMQ_URL || 'amqp://localhost:5672'
    );
    channel = await connection.createChannel();

    // Declare exchanges
    await channel.assertExchange('chat', 'topic', { durable: true });
    await channel.assertExchange('notifications', 'topic', { durable: true });

    console.log('[Chat Service] Connected to RabbitMQ');
  } catch (error) {
    console.error('[Chat Service] RabbitMQ connection error:', error);
    setTimeout(connectRabbitMQ, 5000);
  }
}

export async function publishToQueue(
  exchange: string,
  routingKey: string,
  message: any
): Promise<boolean> {
  try {
    if (!channel) {
      console.error('[Chat Service] RabbitMQ channel not available');
      return false;
    }

    channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );

    return true;
  } catch (error) {
    console.error('[Chat Service] Error publishing to queue:', error);
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
    console.error('[Chat Service] Error closing RabbitMQ connection:', error);
  }
}
