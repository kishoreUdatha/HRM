import amqp from 'amqplib';
import { processAutomaticPayout } from './payoutProcessingService';

let connection: any = null;
let channel: any = null;

const EXCHANGE_NAME = 'hrm_events';
const QUEUE_NAME = 'payout_service_queue';

// Events we're interested in
const ROUTING_KEYS = [
  'payroll.batch.processed',
  'payroll.processed',
  'employee.bankDetails.updated',
];

/**
 * Initialize RabbitMQ connection and start listening for events
 */
export const initializeRabbitMQ = async (): Promise<void> => {
  try {
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();

    // Declare exchange
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

    // Declare queue
    const { queue } = await channel.assertQueue(QUEUE_NAME, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'hrm_dlx',
        'x-dead-letter-routing-key': 'payout.dead',
      },
    });

    // Bind queue to exchange with routing keys
    for (const routingKey of ROUTING_KEYS) {
      await channel.bindQueue(queue, EXCHANGE_NAME, routingKey);
    }

    // Start consuming messages
    channel.consume(queue, async (msg: any) => {
      if (!msg) return;

      try {
        const content = JSON.parse(msg.content.toString());
        const routingKey = msg.fields.routingKey;

        console.log(`Received event: ${routingKey}`, content);

        await handleEvent(routingKey, content);

        channel.ack(msg);
      } catch (error) {
        console.error('Error processing message:', error);
        // Reject and requeue on failure
        channel.nack(msg, false, true);
      }
    });

    console.log('RabbitMQ initialized successfully');
    console.log(`Listening for events: ${ROUTING_KEYS.join(', ')}`);

    // Handle connection errors
    connection.on('error', (err: Error) => {
      console.error('RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      console.log('RabbitMQ connection closed. Reconnecting...');
      setTimeout(initializeRabbitMQ, 5000);
    });
  } catch (error) {
    console.error('Failed to initialize RabbitMQ:', error);
    // Retry connection after delay
    setTimeout(initializeRabbitMQ, 5000);
  }
};

/**
 * Handle incoming events based on routing key
 */
const handleEvent = async (routingKey: string, content: any): Promise<void> => {
  switch (routingKey) {
    case 'payroll.batch.processed':
      await handlePayrollBatchProcessed(content);
      break;

    case 'payroll.processed':
      await handlePayrollProcessed(content);
      break;

    case 'employee.bankDetails.updated':
      await handleBankDetailsUpdated(content);
      break;

    default:
      console.log(`Unhandled event: ${routingKey}`);
  }
};

/**
 * Handle payroll batch processed event - trigger automatic payouts
 */
const handlePayrollBatchProcessed = async (data: {
  tenantId: string;
  batchId: string;
  month: number;
  year: number;
  payrollIds: string[];
}): Promise<void> => {
  console.log(`Processing automatic payout for payroll batch: ${data.batchId}`);

  await processAutomaticPayout({
    tenantId: data.tenantId,
    payrollBatchId: data.batchId,
    month: data.month,
    year: data.year,
    payrollIds: data.payrollIds,
  });
};

/**
 * Handle individual payroll processed event
 */
const handlePayrollProcessed = async (data: {
  tenantId: string;
  payrollId: string;
  employeeId: string;
  netSalary: number;
}): Promise<void> => {
  console.log(`Payroll processed for employee: ${data.employeeId}`);
  // Individual payroll processing can trigger automatic payout if configured
  // This is handled in processAutomaticPayout
};

/**
 * Handle employee bank details updated event
 */
const handleBankDetailsUpdated = async (data: {
  tenantId: string;
  employeeId: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
  };
}): Promise<void> => {
  console.log(`Bank details updated for employee: ${data.employeeId}`);
  // We could auto-create/update fund account here
  // For now, we'll require manual sync or creation
};

/**
 * Publish an event to RabbitMQ
 */
export const publishEvent = async (
  routingKey: string,
  content: Record<string, any>
): Promise<void> => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }

  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(content)),
    { persistent: true }
  );

  console.log(`Published event: ${routingKey}`, content);
};

/**
 * Close RabbitMQ connection
 */
export const closeRabbitMQ = async (): Promise<void> => {
  if (channel) {
    await channel.close();
  }
  if (connection) {
    await connection.close();
  }
};
