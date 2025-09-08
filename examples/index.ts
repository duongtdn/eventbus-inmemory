/**
 * EventBus Examples Index
 *
 * Entry point for all EventBus examples. Import and run any example
 * to see the EventBus in action.
 */

// Basic examples
export { basicUsageExample, runExample as runBasicExample } from './basic-usage'
export { advancedFeaturesExample, runAdvancedExample } from './advanced-features'
export { ecommerceExample, runEcommerceExample } from './ecommerce-scenario'

// Utilities
export { runAllExamples, runSpecificExample, runDemo } from './demo-runner'
export { runTests } from './test-examples'

// Convenience function to run all examples
export async function runAllDemos() {
  console.log('🚀 Running All EventBus Examples\n')

  const { runDemo } = await import('./demo-runner')
  await runDemo('all')

  console.log('\n' + '='.repeat(60) + '\n')

  const { runEcommerceExample } = await import('./ecommerce-scenario')
  console.log('💳 Running E-commerce Scenario...\n')
  await runEcommerceExample()

  console.log('\n🎉 All examples completed!')
}

// Quick start function
export async function quickStart() {
  console.log('⚡ EventBus Quick Start\n')

  const { runExample } = await import('./basic-usage')
  await runExample()
}

/**
 * Example Usage:
 *
 * import { quickStart, runAllDemos, runBasicExample } from './examples'
 *
 * // Quick demo of basic features
 * await quickStart()
 *
 * // Run a specific example
 * await runBasicExample()
 *
 * // Run all examples
 * await runAllDemos()
 */
