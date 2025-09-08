/**
 * Test Runner for EventBus Examples
 *
 * Simple test to verify the examples work correctly.
 */

import { runExample as runBasicExample } from './basic-usage'
import { runAdvancedExample } from './advanced-features'

async function testBasicExample(): Promise<boolean> {
  try {
    console.log('🧪 Testing basic example...')
    await runBasicExample()
    console.log('✅ Basic example test passed')
    return true
  } catch (error) {
    console.error('❌ Basic example test failed:', error)
    return false
  }
}

async function testAdvancedExample(): Promise<boolean> {
  try {
    console.log('🧪 Testing advanced example...')
    await runAdvancedExample()
    console.log('✅ Advanced example test passed')
    return true
  } catch (error) {
    console.error('❌ Advanced example test failed:', error)
    return false
  }
}

async function runTests(): Promise<void> {
  console.log('🚀 Running EventBus Examples Tests\n')

  const results: boolean[] = []

  results.push(await testBasicExample())
  console.log()

  results.push(await testAdvancedExample())
  console.log()

  const passed = results.filter(r => r).length
  const total = results.length

  console.log(`📊 Test Results: ${passed}/${total} passed`)

  if (passed === total) {
    console.log('🎉 All example tests passed!')
  } else {
    console.log('❌ Some example tests failed')
  }
}

export { runTests }
