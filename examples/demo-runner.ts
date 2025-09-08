/**
 * EventBus Examples Runner
 *
 * This file demonstrates how to run the EventBus examples.
 * Run with: npx ts-node examples/demo-runner.ts
 */

import { runExample as runBasicExample } from './basic-usage'
import { runAdvancedExample } from './advanced-features'

async function runAllExamples(): Promise<void> {
  console.log('🚀 Starting EventBus Examples\n')

  try {
    // Run basic example
    await runBasicExample()

    console.log('\n' + '='.repeat(60) + '\n')

    // Run advanced example
    await runAdvancedExample()

    console.log('\n🎉 All examples completed successfully!')

  } catch (error) {
    console.error('❌ Examples failed:', error)
  }
}

async function runSpecificExample(exampleName: string): Promise<void> {
  console.log(`🎯 Running specific example: ${exampleName}\n`)

  try {
    switch (exampleName.toLowerCase()) {
      case 'basic':
        await runBasicExample()
        break

      case 'advanced':
        await runAdvancedExample()
        break

      default:
        console.error(`❌ Unknown example: ${exampleName}`)
        console.log('Available examples: basic, advanced')
        return
    }

    console.log(`\n✅ Example '${exampleName}' completed successfully!`)

  } catch (error) {
    console.error(`❌ Example '${exampleName}' failed:`, error)
  }
}

// Export functions for use in other files
export { runAllExamples, runSpecificExample }

// Simple demo function to run examples programmatically
export async function runDemo(exampleType: 'basic' | 'advanced' | 'all' = 'all') {
  console.log('🚀 EventBus Examples Demo\n')

  switch (exampleType) {
    case 'basic':
      await runBasicExample()
      break
    case 'advanced':
      await runAdvancedExample()
      break
    case 'all':
    default:
      await runAllExamples()
      break
  }
}
