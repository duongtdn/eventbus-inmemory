/**
 * E-commerce Order Processing Example
 *
 * This example shows a realistic e-commerce scenario where multiple services
 * coordinate through events to process an order from creation to fulfillment.
 */

import { EventBus } from '../src/core/event-bus'
import { BasicEvent, EventHandler, Priority } from '../src/types'

// Domain Events
interface OrderCreatedEvent extends BasicEvent {
  eventType: 'order.created'
  data: {
    orderId: string
    customerId: string
    items: Array<{ sku: string; quantity: number; price: number }>
    total: number
    shippingAddress: {
      street: string
      city: string
      zipCode: string
      country: string
    }
  }
}

interface PaymentProcessedEvent extends BasicEvent {
  eventType: 'payment.processed'
  data: {
    orderId: string
    paymentId: string
    amount: number
    status: 'success' | 'failed'
    gatewayResponse?: string
  }
}

interface InventoryCheckedEvent extends BasicEvent {
  eventType: 'inventory.checked'
  data: {
    orderId: string
    items: Array<{ sku: string; available: boolean; reservationId?: string }>
    allAvailable: boolean
  }
}

// Business Services
class OrderService {
  private orders = new Map<string, any>()

  constructor(private eventBus: EventBus) {}

  async createOrder(orderData: any): Promise<string> {
    const orderId = `ORD-${Date.now()}`
    const order = {
      ...orderData,
      orderId,
      status: 'pending',
      createdAt: new Date().toISOString()
    }

    this.orders.set(orderId, order)
    console.log(`🛒 Order created: ${orderId} for customer ${orderData.customerId}`)

    // Publish order created event
    await this.eventBus.publish({
      eventType: 'order.created',
      source: 'OrderService',
      data: order,
      metadata: {
        priority: Priority.HIGH,
        tags: ['order', 'creation']
      }
    } as Partial<OrderCreatedEvent>)

    return orderId
  }

  async updateOrderStatus(orderId: string, status: string, details?: any): Promise<void> {
    const order = this.orders.get(orderId)
    if (order) {
      order.status = status
      order.updatedAt = new Date().toISOString()
      if (details) {
        Object.assign(order, details)
      }

      console.log(`📝 Order ${orderId} status updated to: ${status}`)

      // Publish status update event
      await this.eventBus.publish({
        eventType: 'order.status-updated',
        source: 'OrderService',
        data: {
          orderId,
          status,
          previousStatus: order.previousStatus,
          ...details
        }
      })
    }
  }

  getOrder(orderId: string) {
    return this.orders.get(orderId)
  }

  getAllOrders() {
    return Array.from(this.orders.values())
  }
}

class PaymentService {
  constructor(private eventBus: EventBus) {
    this.setupEventHandlers()
  }

  private async setupEventHandlers(): Promise<void> {
    await this.eventBus.subscribe('order.created', this.handleOrderCreated.bind(this))
    await this.eventBus.subscribe('inventory.reserved', this.processPayment.bind(this))
  }

  private async handleOrderCreated(event: BasicEvent): Promise<void> {
    const orderData = event.data as OrderCreatedEvent['data']
    console.log(`💳 Payment service received order: ${orderData.orderId}`)
    // Payment service knows about the order but waits for inventory confirmation
  }

  private async processPayment(event: BasicEvent): Promise<void> {
    const inventoryData = event.data
    console.log(`💳 Processing payment for order: ${inventoryData.orderId}`)

    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 100))

    const isSuccess = Math.random() > 0.1 // 90% success rate
    const paymentId = `PAY-${Date.now()}`

    await this.eventBus.publish({
      eventType: 'payment.processed',
      source: 'PaymentService',
      data: {
        orderId: inventoryData.orderId,
        paymentId,
        amount: inventoryData.total || 0,
        status: isSuccess ? 'success' : 'failed',
        gatewayResponse: isSuccess ? 'Transaction approved' : 'Insufficient funds'
      }
    } as Partial<PaymentProcessedEvent>)
  }
}

class InventoryService {
  private inventory = new Map([
    ['SKU-001', { available: 100, reserved: 0 }],
    ['SKU-002', { available: 50, reserved: 0 }],
    ['SKU-003', { available: 25, reserved: 0 }]
  ])

  constructor(private eventBus: EventBus) {
    this.setupEventHandlers()
  }

  private async setupEventHandlers(): Promise<void> {
    await this.eventBus.subscribe('order.created', this.checkInventory.bind(this))
  }

  private async checkInventory(event: BasicEvent): Promise<void> {
    const orderData = event.data as OrderCreatedEvent['data']
    console.log(`📦 Checking inventory for order: ${orderData.orderId}`)

    const itemChecks = orderData.items.map(item => {
      const stock = this.inventory.get(item.sku)
      const available = stock ? stock.available >= item.quantity : false

      if (available && stock) {
        // Reserve inventory
        stock.available -= item.quantity
        stock.reserved += item.quantity
      }

      return {
        sku: item.sku,
        available,
        reservationId: available ? `RES-${Date.now()}-${item.sku}` : undefined
      }
    })

    const allAvailable = itemChecks.every(check => check.available)

    if (allAvailable) {
      console.log(`✅ Inventory reserved for order: ${orderData.orderId}`)
      await this.eventBus.publish({
        eventType: 'inventory.reserved',
        source: 'InventoryService',
        data: {
          orderId: orderData.orderId,
          items: itemChecks,
          total: orderData.total
        }
      })
    } else {
      console.log(`❌ Insufficient inventory for order: ${orderData.orderId}`)
      // Release any partial reservations
      this.releaseReservations(orderData.items, itemChecks)

      await this.eventBus.publish({
        eventType: 'inventory.insufficient',
        source: 'InventoryService',
        data: {
          orderId: orderData.orderId,
          items: itemChecks,
          insufficientItems: itemChecks.filter(check => !check.available)
        }
      })
    }
  }

  private releaseReservations(orderItems: any[], itemChecks: any[]): void {
    orderItems.forEach((orderItem, index) => {
      const check = itemChecks[index]
      if (check.available) {
        const stock = this.inventory.get(orderItem.sku)
        if (stock) {
          stock.available += orderItem.quantity
          stock.reserved -= orderItem.quantity
        }
      }
    })
  }

  getInventoryStatus(): Record<string, any> {
    const status: Record<string, any> = {}
    this.inventory.forEach((value, key) => {
      status[key] = { ...value }
    })
    return status
  }
}

class FulfillmentService {
  constructor(private eventBus: EventBus, private orderService: OrderService) {
    this.setupEventHandlers()
  }

  private async setupEventHandlers(): Promise<void> {
    await this.eventBus.subscribe('payment.processed', this.handlePaymentResult.bind(this))
    await this.eventBus.subscribe('inventory.insufficient', this.handleInsufficientInventory.bind(this))
  }

  private async handlePaymentResult(event: BasicEvent): Promise<void> {
    const paymentData = event.data as PaymentProcessedEvent['data']

    if (paymentData.status === 'success') {
      console.log(`🎉 Payment successful for order: ${paymentData.orderId}`)
      await this.orderService.updateOrderStatus(
        paymentData.orderId,
        'confirmed',
        { paymentId: paymentData.paymentId }
      )

      // Start fulfillment process
      await this.fulfillOrder(paymentData.orderId)
    } else {
      console.log(`💸 Payment failed for order: ${paymentData.orderId}`)
      await this.orderService.updateOrderStatus(
        paymentData.orderId,
        'payment-failed',
        { reason: paymentData.gatewayResponse }
      )
    }
  }

  private async handleInsufficientInventory(event: BasicEvent): Promise<void> {
    const inventoryData = event.data
    console.log(`📦 Insufficient inventory for order: ${inventoryData.orderId}`)

    await this.orderService.updateOrderStatus(
      inventoryData.orderId,
      'cancelled',
      { reason: 'Insufficient inventory', insufficientItems: inventoryData.insufficientItems }
    )
  }

  private async fulfillOrder(orderId: string): Promise<void> {
    console.log(`🚚 Starting fulfillment for order: ${orderId}`)

    // Simulate fulfillment process
    await new Promise(resolve => setTimeout(resolve, 50))

    const trackingNumber = `TRK-${Date.now()}`

    await this.orderService.updateOrderStatus(
      orderId,
      'shipped',
      { trackingNumber, shippedAt: new Date().toISOString() }
    )

    await this.eventBus.publish({
      eventType: 'order.shipped',
      source: 'FulfillmentService',
      data: {
        orderId,
        trackingNumber,
        estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    })
  }
}

class NotificationService {
  constructor(private eventBus: EventBus) {
    this.setupEventHandlers()
  }

  private async setupEventHandlers(): Promise<void> {
    // Subscribe to all order events for customer notifications
    await this.eventBus.subscribe('order.*', this.sendCustomerNotification.bind(this))
    await this.eventBus.subscribe('order.shipped', this.sendShippingNotification.bind(this))
  }

  private async sendCustomerNotification(event: BasicEvent): Promise<void> {
    console.log(`📧 Sending customer notification for: ${event.eventType}`)
    // In real implementation, would send email/SMS to customer
  }

  private async sendShippingNotification(event: BasicEvent): Promise<void> {
    const shippingData = event.data
    console.log(`📮 Sending shipping notification with tracking: ${shippingData.trackingNumber}`)
    // In real implementation, would send tracking info to customer
  }
}

async function ecommerceExample(): Promise<void> {
  console.log('=== E-commerce Order Processing Example ===\n')

  // Initialize EventBus
  const eventBus = new EventBus({
    enableLogging: true,
    maxRetries: 2,
    retryDelay: 50
  })

  // Initialize services
  console.log('🏭 Initializing services...')
  const orderService = new OrderService(eventBus)
  const paymentService = new PaymentService(eventBus)
  const inventoryService = new InventoryService(eventBus)
  const fulfillmentService = new FulfillmentService(eventBus, orderService)
  const notificationService = new NotificationService(eventBus)

  console.log(`✅ Services initialized with ${eventBus.getSubscriptionCount()} event subscriptions\n`)

  // Show initial inventory
  console.log('📦 Initial Inventory:')
  const inventory = inventoryService.getInventoryStatus()
  Object.entries(inventory).forEach(([sku, stock]: [string, any]) => {
    console.log(`  ${sku}: ${stock.available} available, ${stock.reserved} reserved`)
  })
  console.log()

  // Example 1: Successful order
  console.log('1. Processing Successful Order:')
  console.log('==============================')

  const order1Id = await orderService.createOrder({
    customerId: 'CUST-001',
    items: [
      { sku: 'SKU-001', quantity: 2, price: 29.99 },
      { sku: 'SKU-002', quantity: 1, price: 49.99 }
    ],
    total: 109.97,
    shippingAddress: {
      street: '123 Main St',
      city: 'Anytown',
      zipCode: '12345',
      country: 'US'
    }
  })

  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 300))

  const finalOrder1 = orderService.getOrder(order1Id)
  console.log(`📋 Order ${order1Id} final status: ${finalOrder1?.status}`)
  console.log()

  // Example 2: Order with insufficient inventory
  console.log('2. Processing Order with Insufficient Inventory:')
  console.log('===============================================')

  const order2Id = await orderService.createOrder({
    customerId: 'CUST-002',
    items: [
      { sku: 'SKU-003', quantity: 100, price: 19.99 } // Only 25 available
    ],
    total: 1999.00,
    shippingAddress: {
      street: '456 Oak Ave',
      city: 'Somewhere',
      zipCode: '67890',
      country: 'US'
    }
  })

  await new Promise(resolve => setTimeout(resolve, 200))

  const finalOrder2 = orderService.getOrder(order2Id)
  console.log(`📋 Order ${order2Id} final status: ${finalOrder2?.status}`)
  console.log()

  // Show final inventory
  console.log('📦 Final Inventory:')
  const finalInventory = inventoryService.getInventoryStatus()
  Object.entries(finalInventory).forEach(([sku, stock]: [string, any]) => {
    console.log(`  ${sku}: ${stock.available} available, ${stock.reserved} reserved`)
  })
  console.log()

  // Show all orders
  console.log('📋 All Orders Summary:')
  const allOrders = orderService.getAllOrders()
  allOrders.forEach(order => {
    console.log(`  Order ${order.orderId}: ${order.status} (Customer: ${order.customerId}, Total: $${order.total})`)
  })
  console.log()

  console.log(`📊 Event Bus Stats:`)
  console.log(`  Active subscriptions: ${eventBus.getSubscriptionCount()}`)

  console.log('\n=== E-commerce Example Complete ===')
}

export { ecommerceExample }
export async function runEcommerceExample() {
  try {
    await ecommerceExample()
  } catch (error) {
    console.error('E-commerce example failed:', error)
  }
}
