/**
 * Advanced EventBus Features Example
 *
 * This example demonstrates advanced features of the EventBus:
 * - Custom configuration with retries and logging
 * - Error handling and resilience
 * - Custom logger implementation
 * - Event validation
 * - Complex event flows and business scenarios
 */

import { EventBus } from '../src/core/event-bus'
import { BasicEvent, EventHandler, EventBusConfig, Priority } from '../src/types'
import { LoggerPlugin } from '../src/logger'

// Custom logger that captures logs for demonstration
class ExampleLogger implements LoggerPlugin {
  private logs: Array<{ level: string; message: string; timestamp: Date }> = []

  async info(message: string, data?: any): Promise<void> {
    this.logs.push({ level: 'INFO', message, timestamp: new Date() })
    console.log(`📄 INFO: ${message}`, data ? JSON.stringify(data, null, 2) : '')
  }

  async warn(message: string, data?: any): Promise<void> {
    this.logs.push({ level: 'WARN', message, timestamp: new Date() })
    console.log(`⚠️  WARN: ${message}`, data ? JSON.stringify(data, null, 2) : '')
  }

  async error(message: string, error?: Error, data?: any): Promise<void> {
    this.logs.push({ level: 'ERROR', message, timestamp: new Date() })
    console.log(`❌ ERROR: ${message}`, error?.message || '', data ? JSON.stringify(data, null, 2) : '')
  }

  async fatal(message: string, error?: Error, data?: any): Promise<void> {
    this.logs.push({ level: 'FATAL', message, timestamp: new Date() })
    console.log(`🔥 FATAL: ${message}`, error?.message || '', data ? JSON.stringify(data, null, 2) : '')
  }

  async debug(message: string, data?: any): Promise<void> {
    this.logs.push({ level: 'DEBUG', message, timestamp: new Date() })
    console.log(`🐛 DEBUG: ${message}`, data ? JSON.stringify(data, null, 2) : '')
  }

  getLogs(): Array<{ level: string; message: string; timestamp: Date }> {
    return [...this.logs]
  }

  clearLogs(): void {
    this.logs = []
  }
}

// Domain-specific event interfaces
interface OrderEvent extends BasicEvent {
  data: {
    orderId: string
    customerId: string
    amount: number
    currency: string
    items: Array<{ productId: string; quantity: number; price: number }>
  }
}

interface PaymentEvent extends BasicEvent {
  data: {
    paymentId: string
    orderId: string
    amount: number
    method: 'card' | 'paypal' | 'bank'
    status: 'pending' | 'completed' | 'failed'
  }
}

interface InventoryEvent extends BasicEvent {
  data: {
    productId: string
    quantity: number
    operation: 'reserve' | 'release' | 'adjust'
  }
}

// Business services that demonstrate real-world usage
class OrderService {
  private orders = new Map<string, any>()

  constructor(private eventBus: EventBus) {
    this.setupEventHandlers()
  }

  private async setupEventHandlers(): Promise<void> {
    // Handle payment completion
    await this.eventBus.subscribe('payment.completed', this.handlePaymentCompleted.bind(this))

    // Handle inventory reservations
    await this.eventBus.subscribe('inventory.reserved', this.handleInventoryReserved.bind(this))
    await this.eventBus.subscribe('inventory.reservation-failed', this.handleInventoryReservationFailed.bind(this))
  }

  async createOrder(orderData: any): Promise<string> {
    const orderId = `order-${Date.now()}`
    const order = { ...orderData, orderId, status: 'pending', createdAt: new Date() }

    this.orders.set(orderId, order)
    console.log(`🛒 Order created: ${orderId}`)

    // Publish order creation event
    const orderEvent: Partial<OrderEvent> = {
      eventType: 'order.created',
      source: 'OrderService',
      data: {
        orderId,
        customerId: orderData.customerId,
        amount: orderData.amount,
        currency: orderData.currency || 'USD',
        items: orderData.items
      },
      metadata: {
        priority: Priority.HIGH,
        tags: ['order', 'creation']
      }
    }

    await this.eventBus.publish(orderEvent)
    return orderId
  }

  private async handlePaymentCompleted(event: BasicEvent): Promise<void> {
    const paymentData = event.data as PaymentEvent['data']
    const order = this.orders.get(paymentData.orderId)

    if (order) {
      order.status = 'confirmed'
      order.paymentId = paymentData.paymentId
      console.log(`✅ Order ${paymentData.orderId} confirmed after payment`)

      // Publish order confirmation event
      await this.eventBus.publish({
        eventType: 'order.confirmed',
        source: 'OrderService',
        data: { orderId: paymentData.orderId, paymentId: paymentData.paymentId }
      })
    }
  }

  private async handleInventoryReserved(event: BasicEvent): Promise<void> {
    const inventoryData = event.data as InventoryEvent['data']
    console.log(`📦 Inventory reserved for product: ${inventoryData.productId}`)
  }

  private async handleInventoryReservationFailed(event: BasicEvent): Promise<void> {
    const inventoryData = event.data as InventoryEvent['data']
    console.log(`❌ Inventory reservation failed for product: ${inventoryData.productId}`)
    // Could trigger order cancellation logic here
  }

  getOrder(orderId: string) {
    return this.orders.get(orderId)
  }
}

class PaymentService {
  constructor(private eventBus: EventBus) {
    this.setupEventHandlers()
  }

  private async setupEventHandlers(): Promise<void> {
    // Handle new orders for payment processing
    await this.eventBus.subscribe('order.created', this.processPayment.bind(this))
  }

  private async processPayment(event: BasicEvent): Promise<void> {
    const orderData = event.data as OrderEvent['data']
    console.log(`💳 Processing payment for order: ${orderData.orderId}`)

    // Simulate payment processing with potential failure
    const isSuccessful = Math.random() > 0.2 // 80% success rate
    const paymentId = `pay-${Date.now()}`

    await new Promise(resolve => setTimeout(resolve, 100)) // Simulate processing time

    if (isSuccessful) {
      await this.eventBus.publish({
        eventType: 'payment.completed',
        source: 'PaymentService',
        data: {
          paymentId,
          orderId: orderData.orderId,
          amount: orderData.amount,
          method: 'card' as const,
          status: 'completed' as const
        }
      })
    } else {
      await this.eventBus.publish({
        eventType: 'payment.failed',
        source: 'PaymentService',
        data: {
          paymentId,
          orderId: orderData.orderId,
          amount: orderData.amount,
          method: 'card' as const,
          status: 'failed' as const,
          reason: 'Insufficient funds'
        }
      })
    }
  }
}

// Service that demonstrates error handling and retries
class NotificationService {
  private failureCount = 0

  constructor(private eventBus: EventBus) {
    this.setupEventHandlers()
  }

  private async setupEventHandlers(): Promise<void> {
    // Subscribe to all order events for notifications
    await this.eventBus.subscribe('order.*', this.sendNotification.bind(this))
  }

  private async sendNotification(event: BasicEvent, context: any): Promise<void> {
    console.log(`📧 Sending notification for: ${event.eventType}`)

    // Simulate failures to demonstrate retry mechanism
    if (this.failureCount < 2) {
      this.failureCount++
      console.log(`❌ Notification failed (attempt ${context.attempt})`)
      throw new Error('Notification service temporarily unavailable')
    }

    // Success after retries
    console.log(`✅ Notification sent successfully for: ${event.eventType}`)
    this.failureCount = 0 // Reset for next event
  }
}

async function advancedFeaturesExample(): Promise<void> {
  console.log('=== Advanced EventBus Features Example ===\n')

  // Create EventBus with custom configuration
  const logger = new ExampleLogger()
  const config: EventBusConfig = {
    maxRetries: 3,
    retryDelay: 100,
    enableLogging: true,
    logger: logger
  }

  const eventBus = new EventBus(config)
  console.log('✓ EventBus created with custom configuration')
  console.log(`  - Max retries: ${config.maxRetries}`)
  console.log(`  - Retry delay: ${config.retryDelay}ms`)
  console.log(`  - Logging enabled: ${config.enableLogging}\n`)

  // Initialize business services
  console.log('🔧 Initializing business services...')
  const orderService = new OrderService(eventBus)
  const paymentService = new PaymentService(eventBus)
  const notificationService = new NotificationService(eventBus)

  console.log('✓ Services initialized and event handlers registered\n')
  console.log(`📊 Total subscriptions: ${eventBus.getSubscriptionCount()}\n`)

  // Example 1: Successful order flow
  console.log('1. Successful Order Processing Flow:')
  console.log('-----------------------------------')

  const orderId1 = await orderService.createOrder({
    customerId: 'customer-123',
    amount: 99.99,
    items: [
      { productId: 'product-1', quantity: 2, price: 49.99 }
    ]
  })

  // Wait a bit for async processing
  await new Promise(resolve => setTimeout(resolve, 200))

  const finalOrder = orderService.getOrder(orderId1)
  console.log(`📋 Final order status: ${finalOrder?.status}`)
  console.log()

  // Example 2: Multiple orders to demonstrate scalability
  console.log('2. Processing Multiple Orders:')
  console.log('-----------------------------')

  const orderPromises: Promise<string>[] = []
  for (let i = 0; i < 3; i++) {
    orderPromises.push(orderService.createOrder({
      customerId: `customer-${i + 200}`,
      amount: Math.round((50 + Math.random() * 100) * 100) / 100,
      items: [{ productId: `product-${i + 1}`, quantity: 1, price: 25.99 }]
    }))
  }

  await Promise.all(orderPromises)
  await new Promise(resolve => setTimeout(resolve, 300))
  console.log('✓ Multiple orders processed concurrently\n')

  // Example 3: Pattern matching with complex subscriptions
  console.log('3. Complex Pattern Matching:')
  console.log('----------------------------')

  // Subscribe to payment events only
  let paymentEventCount = 0
  await eventBus.subscribe('payment.*', async (event) => {
    paymentEventCount++
    console.log(`💰 Payment event #${paymentEventCount}: ${event.eventType}`)
  })

  // Subscribe to all events from PaymentService
  let paymentServiceEventCount = 0
  await eventBus.subscribe('*', async (event) => {
    if (event.source === 'PaymentService') {
      paymentServiceEventCount++
      console.log(`🏢 PaymentService event #${paymentServiceEventCount}: ${event.eventType}`)
    }
  })

  // Trigger some events to demonstrate pattern matching
  await orderService.createOrder({
    customerId: 'pattern-test-customer',
    amount: 75.50,
    items: [{ productId: 'pattern-product', quantity: 1, price: 75.50 }]
  })

  await new Promise(resolve => setTimeout(resolve, 200))
  console.log()

  // Example 4: Error handling and logging
  console.log('4. Error Handling and Logging:')
  console.log('------------------------------')

  console.log('📋 Recent logs from custom logger:')
  const recentLogs = logger.getLogs().slice(-5)
  recentLogs.forEach(log => {
    console.log(`  [${log.timestamp.toISOString()}] ${log.level}: ${log.message}`)
  })
  console.log()

  // Example 5: Configuration inspection
  console.log('5. EventBus Configuration and Stats:')
  console.log('------------------------------------')
  const busConfig = eventBus.getConfig()
  console.log(`📊 Configuration:`)
  console.log(`  - Max retries: ${busConfig.maxRetries}`)
  console.log(`  - Retry delay: ${busConfig.retryDelay}ms`)
  console.log(`  - Logging enabled: ${busConfig.enableLogging}`)
  console.log(`  - Logger type: ${busConfig.logger.constructor.name}`)
  console.log(`  - Validator type: ${busConfig.validator.constructor.name}`)

  console.log(`\n📈 Runtime stats:`)
  console.log(`  - Active subscriptions: ${eventBus.getSubscriptionCount()}`)
  console.log(`  - Has subscriptions: ${eventBus.hasSubscriptions()}`)
  console.log(`  - Total log entries: ${logger.getLogs().length}`)

  console.log('\n=== Advanced Features Example Complete ===')
}

export { advancedFeaturesExample }
export async function runAdvancedExample() {
  try {
    await advancedFeaturesExample()
  } catch (error) {
    console.error('Advanced example failed:', error)
  }
}
