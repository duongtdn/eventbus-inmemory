import { PatternMatcher } from '../pattern-matcher'

describe('PatternMatcher', () => {
  let matcher: PatternMatcher

  beforeEach(() => {
    matcher = new PatternMatcher()
  })

  describe('Pattern Validation Tests', () => {
    describe('Valid Pattern Acceptance', () => {
      it('should accept valid exact match patterns', () => {
				expect(matcher.isValidPattern('Initialized')).toBe(true)
        expect(matcher.isValidPattern('User.AccountCreated')).toBe(true)
        expect(matcher.isValidPattern('Order.Completed')).toBe(true)
        expect(matcher.isValidPattern('System.Started')).toBe(true)
        expect(matcher.isValidPattern('Payment.ProcessingCompleted')).toBe(true)
      })

			it('should accept valid single-level wildcard patterns', () => {
        expect(matcher.isValidPattern('User.*')).toBe(true)
        expect(matcher.isValidPattern('Order.*')).toBe(true)
        expect(matcher.isValidPattern('System.*')).toBe(true)
      })

      it('should accept valid multi-level wildcard patterns', () => {
        expect(matcher.isValidPattern('User.*.*.Event')).toBe(true)
        expect(matcher.isValidPattern('System.*.Service.*')).toBe(true)
        expect(matcher.isValidPattern('Order.*.Payment.*')).toBe(true)
      })

      it('should accept valid suffix wildcard patterns', () => {
        expect(matcher.isValidPattern('*.Ended')).toBe(true)
        expect(matcher.isValidPattern('*.Started')).toBe(true)
        expect(matcher.isValidPattern('*.Completed')).toBe(true)
        expect(matcher.isValidPattern('*.*.Updated')).toBe(true)
      })

			it('should accept global wildcard pattern', () => {
        expect(matcher.isValidPattern('*')).toBe(true)
      })
    })

    describe('Invalid Pattern Rejection', () => {
      it('should reject patterns with invalid characters', () => {
        expect(matcher.isValidPattern('User/AccountCreated')).toBe(false)
        expect(matcher.isValidPattern('User?AccountCreated')).toBe(false)
        expect(matcher.isValidPattern('User[AccountCreated]')).toBe(false)
        expect(matcher.isValidPattern('User{AccountCreated}')).toBe(false)
        expect(matcher.isValidPattern('User@AccountCreated')).toBe(false)
        expect(matcher.isValidPattern('User#AccountCreated')).toBe(false)
      })

			it('should reject empty patterns', () => {
        expect(matcher.isValidPattern('')).toBe(false)
      })

      it('should reject whitespace-only patterns', () => {
        expect(matcher.isValidPattern('   ')).toBe(false)
        expect(matcher.isValidPattern('\t')).toBe(false)
        expect(matcher.isValidPattern('\n')).toBe(false)
        expect(matcher.isValidPattern('  \t  \n  ')).toBe(false)
      })

			it('should reject double asterisk patterns', () => {
        expect(matcher.isValidPattern('User.**')).toBe(false)
        expect(matcher.isValidPattern('**')).toBe(false)
        expect(matcher.isValidPattern('Order.**.*')).toBe(false)
      })

      it('should reject invalid asterisk patterns', () => {
        expect(matcher.isValidPattern('*User')).toBe(false)      // No dot after *
        expect(matcher.isValidPattern('*123')).toBe(false)       // No dot after *
        expect(matcher.isValidPattern('*Something')).toBe(false) // No dot after *
      })
    })
  })

  describe('Pattern Normalization Tests', () => {
    describe('Whitespace Trimming', () => {
      it('should trim leading whitespace from patterns', () => {
        expect(matcher.normalizePattern('  User.*')).toBe('User.*')
        expect(matcher.normalizePattern('\tOrder.Completed')).toBe('Order.Completed')
        expect(matcher.normalizePattern('\n System.Started')).toBe('System.Started')
      })

      it('should trim trailing whitespace from patterns', () => {
        expect(matcher.normalizePattern('User.*  ')).toBe('User.*')
        expect(matcher.normalizePattern('Order.Completed\t')).toBe('Order.Completed')
        expect(matcher.normalizePattern('System.Started \n')).toBe('System.Started')
      })

      it('should trim both leading and trailing whitespace', () => {
        expect(matcher.normalizePattern('  User.*  ')).toBe('User.*')
        expect(matcher.normalizePattern('\t Order.Completed \n')).toBe('Order.Completed')
      })
    })

    describe('Case Preservation', () => {
      it('should preserve original case in patterns', () => {
        expect(matcher.normalizePattern('User.AccountCreated')).toBe('User.AccountCreated')
        expect(matcher.normalizePattern('user.accountcreated')).toBe('user.accountcreated')
        expect(matcher.normalizePattern('USER.ACCOUNT_CREATED')).toBe('USER.ACCOUNT_CREATED')
      })
    })

    describe('Dot Sequence Validation', () => {
      it('should normalize consecutive dots in patterns', () => {
        expect(matcher.normalizePattern('User..AccountCreated')).toBe('User.AccountCreated')
        expect(matcher.normalizePattern('User...Event')).toBe('User.Event')
        expect(matcher.normalizePattern('System....Started')).toBe('System.Started')
      })

      it('should handle multiple consecutive dot sequences', () => {
        expect(matcher.normalizePattern('User..Profile...Updated')).toBe('User.Profile.Updated')
        expect(matcher.normalizePattern('Order...Payment..Completed')).toBe('Order.Payment.Completed')
      })
    })
  })

  describe('Exact Match Algorithm Tests', () => {
    describe('Simple Exact Matching', () => {
      it('should match identical event types and patterns', () => {
				expect(matcher.matches('Initialized', 'Initialized')).toBe(true)
        expect(matcher.matches('User.AccountCreated', 'User.AccountCreated')).toBe(true)
        expect(matcher.matches('Order.Completed', 'Order.Completed')).toBe(true)
        expect(matcher.matches('System.Started', 'System.Started')).toBe(true)
      })

      it('should not match different event types', () => {
				expect(matcher.matches('Initialized', 'Initialization')).toBe(false)
        expect(matcher.matches('User.AccountCreated', 'Order.Completed')).toBe(false)
        expect(matcher.matches('System.Started', 'System.Stopped')).toBe(false)
				expect(matcher.matches('System.Started', 'Service.Stopped')).toBe(false)
      })
    })

    describe('Case Sensitive Matching', () => {
      it('should distinguish between different cases in exact matching', () => {
        expect(matcher.matches('User.AccountCreated', 'user.accountcreated')).toBe(false)
        expect(matcher.matches('Order.Completed', 'ORDER.COMPLETED')).toBe(false)
        expect(matcher.matches('System.Started', 'system.Started')).toBe(false)
      })

      it('should match when case is identical', () => {
        expect(matcher.matches('user.accountcreated', 'user.accountcreated')).toBe(true)
        expect(matcher.matches('ORDER.COMPLETED', 'ORDER.COMPLETED')).toBe(true)
      })
    })

    describe('Special Character Handling', () => {
      it('should handle numbers in exact matching', () => {
        expect(matcher.matches('User123.Account456', 'User123.Account456')).toBe(true)
        expect(matcher.matches('Order2024.Completed', 'Order2024.Completed')).toBe(true)
      })

      it('should handle hyphens and underscores in exact matching', () => {
        expect(matcher.matches('User-Profile.Account_Created', 'User-Profile.Account_Created')).toBe(true)
        expect(matcher.matches('Order_123.Payment-Completed', 'Order_123.Payment-Completed')).toBe(true)
      })

      it('should not match when special characters differ', () => {
        expect(matcher.matches('User-Profile.Created', 'User_Profile.Created')).toBe(false)
        expect(matcher.matches('Order123.Completed', 'Order_123.Completed')).toBe(false)
      })
    })
  })

  describe('Wildcard Pattern Matching Tests', () => {
    describe('Simple Prefix Matching', () => {
      it('should match events using prefix wildcard patterns', () => {
        expect(matcher.matches('User.AccountCreated', 'User.*')).toBe(true)
        expect(matcher.matches('User.ProfileUpdated', 'User.*')).toBe(true)
        expect(matcher.matches('Order.Created', 'Order.*')).toBe(true)
        expect(matcher.matches('Order.Completed', 'Order.*')).toBe(true)
      })

      it('should not match events that do not match prefix', () => {
        expect(matcher.matches('Order.Created', 'User.*')).toBe(false)
        expect(matcher.matches('System.Started', 'User.*')).toBe(false)
      })
    })

    describe('Prefix Boundary Validation', () => {
      it('should respect dot boundaries in wildcard matching', () => {
        // Should not match because UserService does not have a dot after User
        expect(matcher.matches('UserService.Started', 'User.*')).toBe(false)
        expect(matcher.matches('OrderProcessing.Started', 'Order.*')).toBe(false)
      })

      it('should match when dot boundaries are respected', () => {
        expect(matcher.matches('User.Service.Started', 'User.*')).toBe(true)
        expect(matcher.matches('Order.Processing.Started', 'Order.*')).toBe(true)
      })
    })

    describe('Nested Context Matching', () => {
      it('should handle multi-level prefix matching correctly', () => {
        expect(matcher.matches('User.Profile.Updated', 'User.Profile.*')).toBe(true)
        expect(matcher.matches('User.Profile.Created', 'User.Profile.*')).toBe(true)
        expect(matcher.matches('Order.Payment.Completed', 'Order.Payment.*')).toBe(true)
      })

      it('should not match when nested context does not match', () => {
        expect(matcher.matches('User.AccountCreated', 'User.Profile.*')).toBe(false)
        expect(matcher.matches('User.Settings.Updated', 'User.Profile.*')).toBe(false)
        expect(matcher.matches('Order.Created', 'Order.Payment.*')).toBe(false)
      })
    })

    describe('Suffix Wildcard Matching', () => {
      it('should match events using suffix wildcard patterns', () => {
        expect(matcher.matches('Service.Ended', '*.Ended')).toBe(true)
        expect(matcher.matches('Render.Ended', '*.Ended')).toBe(true)
        expect(matcher.matches('Process.Started', '*.Started')).toBe(true)
        expect(matcher.matches('Task.Completed', '*.Completed')).toBe(true)
      })

      it('should not match events that do not match suffix', () => {
        expect(matcher.matches('Service.Started', '*.Ended')).toBe(false)
        expect(matcher.matches('Process.Completed', '*.Started')).toBe(false)
        expect(matcher.matches('User.AccountCreated', '*.Ended')).toBe(false)
      })

      it('should handle multi-level suffix patterns', () => {
        expect(matcher.matches('User.Profile.Updated', '*.*.Updated')).toBe(true)
        expect(matcher.matches('Order.Payment.Completed', '*.*.Completed')).toBe(true)
        expect(matcher.matches('System.Service.Started', '*.*.Started')).toBe(true)
      })

      it('should not match when suffix pattern has wrong number of levels', () => {
        expect(matcher.matches('Service.Ended', '*.*.Ended')).toBe(false)      // 2 parts vs 3 expected
        expect(matcher.matches('User.Profile.Updated', '*.Updated')).toBe(false) // 3 parts vs 2 expected
      })
    })
  })

  describe('Global Wildcard Tests', () => {
    describe('Global Pattern Matching', () => {
      it('should match all event types using global wildcard', () => {
        expect(matcher.matches('User.AccountCreated', '*')).toBe(true)
        expect(matcher.matches('Order.Completed', '*')).toBe(true)
        expect(matcher.matches('System.Started', '*')).toBe(true)
        expect(matcher.matches('Payment.ProcessingCompleted', '*')).toBe(true)
      })
    })

    describe('Global Pattern Edge Cases', () => {
      it('should work with single character event types', () => {
        expect(matcher.matches('A', '*')).toBe(true)
        expect(matcher.matches('Z', '*')).toBe(true)
      })

      it('should work with very long event types', () => {
        const longEventType = 'Very.Long.Event.Type.With.Many.Nested.Contexts.And.Descriptive.Names.That.Exceed.Normal.Length'
        expect(matcher.matches(longEventType, '*')).toBe(true)
      })

      it('should work with complex event types', () => {
        expect(matcher.matches('User-123.Profile_Settings.Updated-2024', '*')).toBe(true)
      })
    })
  })

  describe('Pattern Matching Integration Tests', () => {
    describe('Internal Workflow Integration - matches() calls validate → normalize → match', () => {
      it('should reject invalid patterns even if event type would match exactly', () => {
        // Even though "User.AccountCreated" would exactly match, invalid pattern should fail
        expect(matcher.matches('User.AccountCreated', 'User.**')).toBe(false)
        expect(matcher.matches('User.AccountCreated', '*.User')).toBe(false)
        expect(matcher.matches('User.AccountCreated', '')).toBe(false)
        expect(matcher.matches('User.AccountCreated', '   ')).toBe(false)
      })

      it('should internally normalize patterns with whitespace before matching', () => {
        // matches() should call normalize internally, so whitespace patterns should work
        expect(matcher.matches('User.AccountCreated', '  User.AccountCreated  ')).toBe(true)
        expect(matcher.matches('User.AccountCreated', '  User.*  ')).toBe(true)
        expect(matcher.matches('System.Started', '  *  ')).toBe(true)
      })

      it('should internally normalize patterns with consecutive dots before matching', () => {
        // matches() should normalize consecutive dots internally
        expect(matcher.matches('User.Profile.Updated', 'User..Profile...Updated')).toBe(true)
        expect(matcher.matches('User.AccountCreated', 'User.*')).toBe(true)
        expect(matcher.matches('User.Profile.Created', 'User..Profile..*')).toBe(true)
      })

      it('should handle complex patterns through internal validation and normalization', () => {
        // Complex pattern with both whitespace and formatting issues
        const messyPattern = '  User..*.Service..*  '

        // Should work because matches() internally validates and normalizes
        expect(matcher.matches('User.Profile.Service.Started', messyPattern)).toBe(true)
        expect(matcher.matches('User.Account.Service.Stopped', messyPattern)).toBe(true)
        expect(matcher.matches('User.Profile.Updated', messyPattern)).toBe(false)
      })
    })

    describe('Mixed Pattern Type Handling', () => {
      it('should handle multiple different pattern types correctly', () => {
        // Test that matcher can handle exact, wildcard, and global patterns
        expect(matcher.matches('User.AccountCreated', 'User.AccountCreated')).toBe(true) // exact
        expect(matcher.matches('User.ProfileUpdated', 'User.*')).toBe(true) // prefix wildcard
        expect(matcher.matches('Service.Started', '*.Started')).toBe(true) // suffix wildcard
        expect(matcher.matches('System.Started', '*')).toBe(true) // global
      })
    })

    describe('Pattern Conflict Resolution', () => {
      it('should handle overlapping pattern matches consistently', () => {
        // Test that an event that could match multiple patterns behaves consistently
        const eventType = 'User.AccountCreated'

        expect(matcher.matches(eventType, 'User.AccountCreated')).toBe(true) // exact
        expect(matcher.matches(eventType, 'User.*')).toBe(true) // wildcard
        expect(matcher.matches(eventType, '*')).toBe(true) // global
      })
    })
  })

  describe('Error Handling Tests', () => {
    describe('Invalid Event Type Handling', () => {
      it('should handle null event types gracefully', () => {
        expect(() => matcher.matches(null as any, 'User.*')).not.toThrow()
        expect(matcher.matches(null as any, 'User.*')).toBe(false)
      })

      it('should handle undefined event types gracefully', () => {
        expect(() => matcher.matches(undefined as any, 'User.*')).not.toThrow()
        expect(matcher.matches(undefined as any, 'User.*')).toBe(false)
      })

      it('should handle empty string event types', () => {
        expect(matcher.matches('', 'User.*')).toBe(false)
        expect(matcher.matches('', '*')).toBe(false)
      })
    })

    describe('Malformed Pattern Handling', () => {
      it('should handle null patterns gracefully', () => {
        expect(() => matcher.matches('User.AccountCreated', null as any)).not.toThrow()
        expect(matcher.matches('User.AccountCreated', null as any)).toBe(false)
      })

      it('should handle undefined patterns gracefully', () => {
        expect(() => matcher.matches('User.AccountCreated', undefined as any)).not.toThrow()
        expect(matcher.matches('User.AccountCreated', undefined as any)).toBe(false)
      })

      it('should handle empty string patterns', () => {
        expect(matcher.matches('User.AccountCreated', '')).toBe(false)
      })
    })
  })
})
