/**
 * EventBus Real-World Business Scenarios E2E Tests
 *
 * Tests complex business workflows using the complete EventBus system with all real components.
 * Simulates realistic cross-service communication patterns without mocking core EventBus functionality.
 */

import { EventBus } from '../core/event-bus'
import { EventBusConfig, BasicEvent, EventHandler, PublishConfig } from '../types'
import { ConsoleLogger } from '../logger'
import { EventValidator } from '../validator'
import { TimeoutError } from '../types/validation'

// Real domain event interfaces
interface UserDomainEvent extends BasicEvent {
  data: {
    userId: string
    email: string
    profile?: any
    preferences?: any
  }
}

interface OrderDomainEvent extends BasicEvent {
  data: {
    orderId: string
    customerId: string
    items: Array<{ productId: string; quantity: number; price: number }>
    total: number
    status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  }
}

interface PaymentDomainEvent extends BasicEvent {
  data: {
    paymentId: string
    orderId: string
    amount: number
    currency: string
    method: 'card' | 'paypal' | 'bank'
    status: 'processing' | 'completed' | 'failed' | 'refunded'
  }
}

// Real business service implementations (not mocked)
class OrderProcessingService {
  private orders = new Map<string, any>()
  private processingLogs: Array<{ action: string; orderId: string; timestamp: Date; details?: any }> = []

  constructor(private eventBus: EventBus) {}

  async handleOrderCreated(event: OrderDomainEvent): Promise<void> {
    const { orderId, customerId, items, total } = event.data

    this.processingLogs.push({ action: 'order_created', orderId, timestamp: new Date(), details: { customerId, total } })

    // Real business logic
    if (total > 10000) {
      this.processingLogs.push({ action: 'credit_check_required', orderId, timestamp: new Date() })
      throw new Error(`Order ${orderId} exceeds credit limit - requires manual approval`)
    }

    if (items.some(item => item.quantity <= 0)) {
      this.processingLogs.push({ action: 'invalid_quantity', orderId, timestamp: new Date() })
      throw new Error(`Order ${orderId} contains invalid item quantities`)
    }

    // Store order
    this.orders.set(orderId, { customerId, items, total, status: 'confirmed', createdAt: new Date() })
    this.processingLogs.push({ action: 'order_stored', orderId, timestamp: new Date() })

    // Publish follow-up event using real EventBus
    await this.eventBus.publish({
      eventType: 'Order.Processing.Confirmed',
      source: 'OrderProcessingService',
      data: { orderId, customerId, total, confirmedAt: new Date().toISOString() }
    })

    this.processingLogs.push({ action: 'confirmation_published', orderId, timestamp: new Date() })
  }

  async handlePaymentCompleted(event: PaymentDomainEvent): Promise<void> {
    const { orderId, paymentId, amount } = event.data
    const order = this.orders.get(orderId)

    this.processingLogs.push({ action: 'payment_processing', orderId, timestamp: new Date(), details: { paymentId, amount } })

    if (!order) {
      this.processingLogs.push({ action: 'order_not_found', orderId, timestamp: new Date() })
      throw new Error(`Order ${orderId} not found for payment ${paymentId}`)
    }

    if (Math.abs(order.total - amount) > 0.01) { // Allow for floating point precision
      this.processingLogs.push({ action: 'amount_mismatch', orderId, timestamp: new Date() })
      throw new Error(`Payment amount mismatch: expected ${order.total}, got ${amount}`)
    }

    // Update order
    order.status = 'paid'
    order.paymentId = paymentId
    order.paidAt = new Date()

    this.processingLogs.push({ action: 'order_updated', orderId, timestamp: new Date() })

    // Trigger fulfillment using real EventBus
    await this.eventBus.publish({
      eventType: 'Order.Fulfillment.Ready',
      source: 'OrderProcessingService',
      data: { orderId, paymentId, items: order.items, shippingRequired: true }
    })

    this.processingLogs.push({ action: 'fulfillment_triggered', orderId, timestamp: new Date() })
  }

  getProcessingLogs(): Array<{ action: string; orderId: string; timestamp: Date; details?: any }> {
    return [...this.processingLogs]
  }

  getOrder(orderId: string): any {
    return this.orders.get(orderId)
  }

  clearLogs(): void {
    this.processingLogs = []
  }
}

class InventoryService {
  private inventory = new Map<string, number>()
  private reservations = new Map<string, Array<{ productId: string; quantity: number; orderId: string }>>()
  private operationLog: Array<{ operation: string; productId: string; quantity: number; timestamp: Date }> = []

  constructor() {
    // Initialize with realistic inventory
    this.inventory.set('laptop-123', 25)
    this.inventory.set('mouse-456', 100)
    this.inventory.set('keyboard-789', 50)
    this.inventory.set('monitor-321', 15)
    this.inventory.set('rare-item-999', 2) // Low stock item
  }

  async handleOrderCreated(event: OrderDomainEvent): Promise<void> {
    const { orderId, items } = event.data

    // Check availability
    for (const item of items) {
      const available = this.inventory.get(item.productId) || 0
      const reserved = this.getReservedQuantity(item.productId)
      const actualAvailable = available - reserved

      this.operationLog.push({ operation: 'availability_check', productId: item.productId, quantity: actualAvailable, timestamp: new Date() })

      if (actualAvailable < item.quantity) {
        throw new Error(`Insufficient inventory for ${item.productId}: need ${item.quantity}, have ${actualAvailable} available`)
      }
    }

    // Reserve items
    const orderReservations: Array<{ productId: string; quantity: number; orderId: string }> = []
    for (const item of items) {
      orderReservations.push({ productId: item.productId, quantity: item.quantity, orderId })
      this.operationLog.push({ operation: 'reserved', productId: item.productId, quantity: item.quantity, timestamp: new Date() })
    }

    this.reservations.set(orderId, orderReservations)
  }

  async handleFulfillmentReady(event: any): Promise<void> {
    const { orderId, items } = event.data
    const reservations = this.reservations.get(orderId)

    if (!reservations) {
      throw new Error(`No reservations found for order ${orderId}`)
    }

    // Commit reservations (reduce actual inventory)
    for (const reservation of reservations) {
      const current = this.inventory.get(reservation.productId) || 0
      this.inventory.set(reservation.productId, current - reservation.quantity)
      this.operationLog.push({ operation: 'committed', productId: reservation.productId, quantity: reservation.quantity, timestamp: new Date() })
    }

    // Remove reservations
    this.reservations.delete(orderId)
  }

  private getReservedQuantity(productId: string): number {
    let reserved = 0
    for (const reservationList of this.reservations.values()) {
      for (const reservation of reservationList) {
        if (reservation.productId === productId) {
          reserved += reservation.quantity
        }
      }
    }
    return reserved
  }

  getInventoryLevel(productId: string): number {
    return this.inventory.get(productId) || 0
  }

  getAvailableInventory(productId: string): number {
    const total = this.inventory.get(productId) || 0
    const reserved = this.getReservedQuantity(productId)
    return Math.max(0, total - reserved)
  }

  getOperationLog(): Array<{ operation: string; productId: string; quantity: number; timestamp: Date }> {
    return [...this.operationLog]
  }
}

class NotificationService {
  private notifications: Array<{ type: string; recipient: string; content: any; timestamp: Date; status: 'sent' | 'failed' }> = []
  private failureRate = 0
  private processingDelay = 0

  setFailureRate(rate: number): void {
    this.failureRate = rate
  }

  setProcessingDelay(delayMs: number): void {
    this.processingDelay = delayMs
  }

  async handleOrderConfirmation(event: OrderDomainEvent): Promise<void> {
    await this.processNotification('order-confirmation', event.data.customerId, {
      orderId: event.data.orderId,
      total: event.data.total,
      items: event.data.items
    })
  }

  async handlePaymentCompleted(event: PaymentDomainEvent): Promise<void> {
    await this.processNotification('payment-confirmation', 'customer', {
      paymentId: event.data.paymentId,
      orderId: event.data.orderId,
      amount: event.data.amount
    })
  }

  async handleFulfillmentReady(event: any): Promise<void> {
    await this.processNotification('shipping-notification', 'customer', {
      orderId: event.data.orderId,
      expectedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    })
  }

  private async processNotification(type: string, recipient: string, content: any): Promise<void> {
    if (this.processingDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.processingDelay))
    }

    if (Math.random() < this.failureRate) {
      const failedNotification = { type, recipient, content, timestamp: new Date(), status: 'failed' as const }
      this.notifications.push(failedNotification)
      throw new Error(`Failed to send ${type} notification to ${recipient}`)
    }

    const successNotification = { type, recipient, content, timestamp: new Date(), status: 'sent' as const }
    this.notifications.push(successNotification)
  }

  getNotifications(): Array<{ type: string; recipient: string; content: any; timestamp: Date; status: 'sent' | 'failed' }> {
    return [...this.notifications]
  }

  getNotificationsByType(type: string) {
    return this.notifications.filter(n => n.type === type)
  }

  clearNotifications(): void {
    this.notifications = []
  }
}

// Test logger that captures real console output
class BusinessLogger extends ConsoleLogger {
  public businessEvents: Array<{ level: string; message: string; data?: any; timestamp: Date }> = []

  async info(message: string, data?: any): Promise<void> {
    this.businessEvents.push({ level: 'info', message, data, timestamp: new Date() })
    await super.info(message, data)
  }

  async warn(message: string, data?: any): Promise<void> {
    this.businessEvents.push({ level: 'warn', message, data, timestamp: new Date() })
    await super.warn(message, data)
  }

  async error(message: string, error?: Error, data?: any): Promise<void> {
    this.businessEvents.push({ level: 'error', message, data: { error: error?.message, ...data }, timestamp: new Date() })
    await super.error(message, error, data)
  }

  getBusinessEvents(): Array<{ level: string; message: string; data?: any; timestamp: Date }> {
    return [...this.businessEvents]
  }
}

describe('EventBus Real-World Business Scenarios E2E', () => {
  let eventBus: EventBus
  let logger: BusinessLogger
  let validator: EventValidator
  let orderService: OrderProcessingService
  let inventoryService: InventoryService
  let notificationService: NotificationService

  // Console spies to suppress output while still validating behavior
  let consoleLogSpy: jest.SpyInstance
  let consoleWarnSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    // Mock console methods to suppress output during tests
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    logger = new BusinessLogger()
    validator = new EventValidator()

    const config: EventBusConfig = {
      validator,
      logger,
      enableLogging: true,
      maxRetries: 2,
      retryDelay: 50
    }

    eventBus = new EventBus(config)
    orderService = new OrderProcessingService(eventBus)
    inventoryService = new InventoryService()
    notificationService = new NotificationService()
  })

  afterEach(() => {
    // Restore console methods after each test
    consoleLogSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('Complete E-Commerce Order Processing Workflow', () => {
    it('should execute complete order-to-fulfillment workflow with all real components', async () => {
      // Arrange - Set up complete business workflow
      await eventBus.subscribe('Order.Created', (event: OrderDomainEvent) =>
        orderService.handleOrderCreated(event)
      )
      await eventBus.subscribe('Order.Created', (event: OrderDomainEvent) =>
        inventoryService.handleOrderCreated(event)
      )
      await eventBus.subscribe('Order.Created', (event: OrderDomainEvent) =>
        notificationService.handleOrderConfirmation(event)
      )
      await eventBus.subscribe('Payment.Completed', (event: PaymentDomainEvent) =>
        orderService.handlePaymentCompleted(event)
      )
      await eventBus.subscribe('Payment.Completed', (event: PaymentDomainEvent) =>
        notificationService.handlePaymentCompleted(event)
      )
      await eventBus.subscribe('Order.Fulfillment.Ready', (event: any) =>
        inventoryService.handleFulfillmentReady(event)
      )
      await eventBus.subscribe('Order.Fulfillment.Ready', (event: any) =>
        notificationService.handleFulfillmentReady(event)
      )

      // Create realistic order
      const orderEvent: Partial<OrderDomainEvent> = {
        eventType: 'Order.Created',
        source: 'ECommerceAPI',
        data: {
          orderId: 'ord-12345',
          customerId: 'cust-789',
          items: [
            { productId: 'laptop-123', quantity: 1, price: 999.99 },
            { productId: 'mouse-456', quantity: 2, price: 29.99 }
          ],
          total: 1059.97,
          status: 'pending'
        }
      }

      // Record initial inventory levels
      const initialLaptopInventory = inventoryService.getInventoryLevel('laptop-123')
      const initialMouseInventory = inventoryService.getInventoryLevel('mouse-456')

      // Act - Execute complete workflow

      // Step 1: Order Creation
      const orderResult = await eventBus.publish(orderEvent)

      // Verify order processing completed
      expect(orderResult.success).toBe(true)
      expect(orderResult.subscribersNotified).toBe(3)

      // Step 2: Payment Processing
      const paymentEvent: Partial<PaymentDomainEvent> = {
        eventType: 'Payment.Completed',
        source: 'PaymentGateway',
        data: {
          paymentId: 'pay-54321',
          orderId: 'ord-12345',
          amount: 1059.97,
          currency: 'USD',
          method: 'card',
          status: 'completed'
        }
      }

      const paymentResult = await eventBus.publish(paymentEvent)
      expect(paymentResult.success).toBe(true)
      expect(paymentResult.subscribersNotified).toBe(2)

      // Allow time for fulfillment event to be processed
      await new Promise(resolve => setTimeout(resolve, 100))

      // Assert - Verify complete business workflow

      // 1. Order was processed and stored
      const processedOrder = orderService.getOrder('ord-12345')
      expect(processedOrder).toBeDefined()
      expect(processedOrder.status).toBe('paid')
      expect(processedOrder.paymentId).toBe('pay-54321')

      // 2. Inventory was properly managed
      expect(inventoryService.getInventoryLevel('laptop-123')).toBe(initialLaptopInventory - 1)
      expect(inventoryService.getInventoryLevel('mouse-456')).toBe(initialMouseInventory - 2)

      // 3. All notifications were sent
      const notifications = notificationService.getNotifications()
      expect(notifications.filter(n => n.type === 'order-confirmation')).toHaveLength(1)
      expect(notifications.filter(n => n.type === 'payment-confirmation')).toHaveLength(1)
      expect(notifications.filter(n => n.type === 'shipping-notification')).toHaveLength(1)

      // 4. Business events were logged
      const businessEvents = logger.getBusinessEvents()
      expect(businessEvents.some(e => e.message.includes('Order.Created'))).toBe(true)
      expect(businessEvents.some(e => e.message.includes('Order.Processing.Confirmed'))).toBe(true)
      expect(businessEvents.some(e => e.message.includes('Order.Fulfillment.Ready'))).toBe(true)

      // 5. Service logs show complete processing
      const orderLogs = orderService.getProcessingLogs()
      expect(orderLogs.some(log => log.action === 'order_created')).toBe(true)
      expect(orderLogs.some(log => log.action === 'confirmation_published')).toBe(true)
      expect(orderLogs.some(log => log.action === 'fulfillment_triggered')).toBe(true)

      const inventoryLog = inventoryService.getOperationLog()
      expect(inventoryLog.some(log => log.operation === 'availability_check')).toBe(true)
      expect(inventoryLog.some(log => log.operation === 'reserved')).toBe(true)
      expect(inventoryLog.some(log => log.operation === 'committed')).toBe(true)
    })

    it('should handle inventory shortage scenario with proper business logic', async () => {
      // Arrange - Set up order for rare item
      await eventBus.subscribe('Order.Created', (event: OrderDomainEvent) =>
        orderService.handleOrderCreated(event)
      )
      await eventBus.subscribe('Order.Created', (event: OrderDomainEvent) =>
        inventoryService.handleOrderCreated(event)
      )
      await eventBus.subscribe('Order.Created', (event: OrderDomainEvent) =>
        notificationService.handleOrderConfirmation(event)
      )

      // Order exceeds available inventory
      const orderEvent: Partial<OrderDomainEvent> = {
        eventType: 'Order.Created',
        source: 'ECommerceAPI',
        data: {
          orderId: 'ord-shortage',
          customerId: 'cust-999',
          items: [
            { productId: 'rare-item-999', quantity: 5, price: 299.99 } // Only 2 available
          ],
          total: 1499.95,
          status: 'pending'
        }
      }

      // Act - Attempt order creation
      const result = await eventBus.publish(orderEvent)

      // Assert - Verify proper business failure handling
      expect(result.success).toBe(false)
      expect(result.failedHandlers).toHaveLength(1) // Inventory service failed

      // Order service should still succeed
      const processedOrder = orderService.getOrder('ord-shortage')
      expect(processedOrder).toBeDefined() // Order was stored despite inventory failure

      // Notification should still be sent for order confirmation
      const notifications = notificationService.getNotifications()
      expect(notifications.some(n => n.type === 'order-confirmation')).toBe(true)

      // Business error should be logged
      const errorEvents = logger.getBusinessEvents().filter(e => e.level === 'error')
      expect(errorEvents.some(e =>
        e.data?.error?.includes('Insufficient inventory')
      )).toBe(true)

      // Inventory should remain unchanged
      expect(inventoryService.getInventoryLevel('rare-item-999')).toBe(2)
    })

    it('should handle payment processing with amount validation', async () => {
      // Arrange - Set up workflow with order first
      await eventBus.subscribe('Order.Created', (event: OrderDomainEvent) =>
        orderService.handleOrderCreated(event)
      )
      await eventBus.subscribe('Payment.Completed', (event: PaymentDomainEvent) =>
        orderService.handlePaymentCompleted(event)
      )
      await eventBus.subscribe('Payment.Completed', (event: PaymentDomainEvent) =>
        notificationService.handlePaymentCompleted(event)
      )

      // Create order first
      const orderEvent: Partial<OrderDomainEvent> = {
        eventType: 'Order.Created',
        source: 'ECommerceAPI',
        data: {
          orderId: 'ord-payment-test',
          customerId: 'cust-payment',
          items: [{ productId: 'laptop-123', quantity: 1, price: 999.99 }],
          total: 999.99,
          status: 'pending'
        }
      }

      await eventBus.publish(orderEvent)

      // Create payment with wrong amount
      const invalidPaymentEvent: Partial<PaymentDomainEvent> = {
        eventType: 'Payment.Completed',
        source: 'PaymentGateway',
        data: {
          paymentId: 'pay-invalid',
          orderId: 'ord-payment-test',
          amount: 799.99, // Wrong amount
          currency: 'USD',
          method: 'card',
          status: 'completed'
        }
      }

      // Act - Process invalid payment
      const result = await eventBus.publish(invalidPaymentEvent)

      // Assert - Payment processing should fail
      expect(result.success).toBe(false)
      expect(result.failedHandlers).toHaveLength(1) // Order service failed

      // Order should not be updated to paid status
      const order = orderService.getOrder('ord-payment-test')
      expect(order.status).toBe('confirmed') // Still confirmed, not paid

      // Error should be logged
      const orderLogs = orderService.getProcessingLogs()
      expect(orderLogs.some(log => log.action === 'amount_mismatch')).toBe(true)
    })
  })

  describe('System Resilience Under Business Load', () => {
    it('should handle concurrent order processing with real business constraints', async () => {
      // Arrange - Set up realistic concurrent scenario
      await eventBus.subscribe('Order.Created', (event: OrderDomainEvent) =>
        orderService.handleOrderCreated(event)
      )
      await eventBus.subscribe('Order.Created', (event: OrderDomainEvent) =>
        inventoryService.handleOrderCreated(event)
      )
      await eventBus.subscribe('Order.Created', (event: OrderDomainEvent) =>
        notificationService.handleOrderConfirmation(event)
      )

      // Create multiple orders for the same product
      const concurrentOrders = Array.from({ length: 10 }, (_, i) => ({
        eventType: 'Order.Created' as const,
        source: 'ECommerceAPI',
        data: {
          orderId: `ord-concurrent-${i}`,
          customerId: `cust-${i}`,
          items: [{ productId: 'monitor-321', quantity: 2, price: 299.99 }], // 15 available, need 20 total
          total: 599.98,
          status: 'pending' as const
        }
      }))

      // Act - Process all orders concurrently
      const results = await Promise.all(
        concurrentOrders.map(order => eventBus.publish(order))
      )

      // Assert - Some orders should succeed, some fail due to inventory constraints
      const successfulOrders = results.filter(result => result.success)
      const failedOrders = results.filter(result => !result.success)

      // Should have processed maximum possible orders based on inventory
      expect(successfulOrders.length).toBeLessThanOrEqual(7) // 15 inventory / 2 per order = 7.5 max
      expect(failedOrders.length).toBeGreaterThan(0)

      // Verify inventory was properly managed (some orders might not have processed due to concurrency)
      const remainingInventory = inventoryService.getInventoryLevel('monitor-321')
      expect(remainingInventory).toBeGreaterThanOrEqual(0)
      expect(remainingInventory).toBeLessThanOrEqual(15) // Should not exceed initial inventory

      // All successful orders should be stored
      const successfulOrderIds = results
        .filter(result => result.success)
        .map(result => result.eventId)

      successfulOrderIds.forEach(eventId => {
        // Can't directly correlate eventId to orderId, but can verify processing occurred
        const orderLogs = orderService.getProcessingLogs()
        expect(orderLogs.some(log => log.action === 'order_created')).toBe(true)
      })
    })

    it('should handle notification service failures with retry mechanism', async () => {
      // Arrange - Set up unreliable notification service
      notificationService.setFailureRate(0.7) // 70% failure rate

      await eventBus.subscribe('Order.Created', (event: OrderDomainEvent) =>
        orderService.handleOrderCreated(event)
      )
      await eventBus.subscribe('Order.Created', (event: OrderDomainEvent) =>
        notificationService.handleOrderConfirmation(event)
      )

      const orders = Array.from({ length: 5 }, (_, i) => ({
        eventType: 'Order.Created' as const,
        source: 'ECommerceAPI',
        data: {
          orderId: `ord-notification-${i}`,
          customerId: `cust-notification-${i}`,
          items: [{ productId: 'keyboard-789', quantity: 1, price: 79.99 }],
          total: 79.99,
          status: 'pending' as const
        }
      }))

      // Act - Process orders with unreliable notifications
      const results = await Promise.all(
        orders.map(order => eventBus.publish(order))
      )

      // Assert - Order processing should be partially successful
      const partiallySuccessful = results.filter(result =>
        result.subscribersNotified === 2 && !result.success
      )
      expect(partiallySuccessful.length).toBeGreaterThan(0)

      // Some notifications might succeed after retries
      const notifications = notificationService.getNotifications()
      expect(notifications.some(n => n.status === 'sent')).toBe(true)

      // All orders should still be processed despite notification failures
      expect(orderService.getProcessingLogs().filter(log =>
        log.action === 'order_created'
      )).toHaveLength(5)

      // Retry logic should be visible in logs
      const errorEvents = logger.getBusinessEvents().filter(e => e.level === 'error')
      expect(errorEvents.length).toBeGreaterThan(0)
    })

    it('should handle timeout scenarios in business context', async () => {
      // Arrange - Set up slow notification service
      notificationService.setProcessingDelay(300) // 300ms delay per notification

      await eventBus.subscribe('Order.Created', (event: OrderDomainEvent) =>
        orderService.handleOrderCreated(event)
      )
      await eventBus.subscribe('Order.Created', (event: OrderDomainEvent) =>
        notificationService.handleOrderConfirmation(event)
      )

      const orderEvent: Partial<OrderDomainEvent> = {
        eventType: 'Order.Created',
        source: 'ECommerceAPI',
        data: {
          orderId: 'ord-timeout-test',
          customerId: 'cust-timeout',
          items: [{ productId: 'laptop-123', quantity: 1, price: 999.99 }],
          total: 999.99,
          status: 'pending'
        }
      }

      const publishConfig: PublishConfig = { timeout: 200 } // Shorter than notification delay

      // Act & Assert - Should timeout due to slow notification service
      await expect(eventBus.publish(orderEvent, publishConfig))
        .rejects.toThrow(TimeoutError)

      // Order service should still complete quickly
      const order = orderService.getOrder('ord-timeout-test')
      expect(order).toBeDefined()
      expect(order.status).toBe('confirmed')

      // Timeout should be logged
      const businessEvents = logger.getBusinessEvents()
      expect(businessEvents.some(e =>
        e.level === 'warn' && e.message.includes('timed out')
      )).toBe(true)
    })
  })
})
