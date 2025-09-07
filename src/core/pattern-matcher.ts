/**
 * Pattern matcher for event types with wildcard support
 * Supports exact matches, prefix wildcards (User.*), and global wildcard (*)
 */
export class PatternMatcher {

  // Constants for validation
  private static readonly INVALID_CHARS_REGEX = /[\/\?\[\]\{\}@#]/
  private static readonly CONSECUTIVE_DOTS_REGEX = /\.{2,}/g
  private static readonly GLOBAL_WILDCARD = '*'

  /**
   * Validates if a pattern is syntactically correct
   * @param pattern - The pattern to validate
   * @returns true if pattern is valid, false otherwise
   */
  isValidPattern(pattern: string): boolean {
    if (!this.isValidString(pattern)) {
      return false
    }

    const trimmed = pattern.trim()
    if (trimmed === '') {
      return false
    }

    return this.isValidPatternStructure(pattern)
  }

	  /**
   * Checks if input is a valid non-empty string
   * @param input - The input to validate
   * @returns true if input is a valid string
   */
  private isValidString(input: any): boolean {
    return input && typeof input === 'string'
  }

  /**
   * Validates the structural rules of a pattern
   * @param pattern - The pattern to validate
   * @returns true if pattern structure is valid
   */
  private isValidPatternStructure(pattern: string): boolean {
    // Check for invalid characters
    if (PatternMatcher.INVALID_CHARS_REGEX.test(pattern)) {
      return false
    }

    // Check for double asterisk patterns
    if (pattern.includes('**')) {
      return false
    }

    // Check for invalid wildcard patterns
    // Only reject patterns like "*something" (without dot) that are not the global "*"
    if (pattern.startsWith('*') && pattern !== PatternMatcher.GLOBAL_WILDCARD && !pattern.startsWith('*.')) {
      return false
    }

    return true
  }

  /**
   * Normalizes a pattern by trimming whitespace and cleaning up formatting
   * @param pattern - The pattern to normalize
   * @returns normalized pattern string
   */
  normalizePattern(pattern: string): string {
    if (!this.isValidString(pattern)) {
      return ''
    }

    return pattern
      .trim()
      .replace(PatternMatcher.CONSECUTIVE_DOTS_REGEX, '.')
  }

  /**
   * Checks if an event type matches a given pattern
   * @param eventType - The event type to test
   * @param pattern - The pattern to match against
   * @returns true if event type matches pattern, false otherwise
   */
  matches(eventType: string, pattern: string): boolean {
    if (!this.isValidString(eventType) || !this.isValidString(pattern)) {
      return false
    }

    if (!this.isValidPattern(pattern)) {
      return false
    }

    const normalizedPattern = this.normalizePattern(pattern)

    return this.performMatching(eventType, normalizedPattern)
  }

  /**
   * Performs the actual pattern matching logic
   * @param eventType - The event type to test
   * @param normalizedPattern - The normalized pattern
   * @returns true if event type matches pattern
   */
  private performMatching(eventType: string, normalizedPattern: string): boolean {
    // Global wildcard matches everything
    if (normalizedPattern === PatternMatcher.GLOBAL_WILDCARD) {
      return true
    }

    // Exact match (no wildcards)
    if (!normalizedPattern.includes('*')) {
      return eventType === normalizedPattern
    }

    // Pattern matching with wildcards
    return this.matchWildcardPattern(eventType, normalizedPattern)
  }

  /**
   * Matches an event type against a wildcard pattern
   * @param eventType - The event type to test
   * @param pattern - The normalized pattern with wildcards
   * @returns true if event type matches the wildcard pattern
   */
  private matchWildcardPattern(eventType: string, pattern: string): boolean {
    const patternParts = pattern.split('.')
    const eventParts = eventType.split('.')

    return this.matchPatternParts(eventParts, patternParts, 0, 0)
  }

  /**
   * Recursively matches pattern parts against event parts
   * @param eventParts - The event type split by dots
   * @param patternParts - The pattern split by dots
   * @param eventIndex - Current index in eventParts
   * @param patternIndex - Current index in patternParts
   * @returns true if the remaining parts match
   */
  private matchPatternParts(eventParts: string[], patternParts: string[], eventIndex: number, patternIndex: number): boolean {
    // Base cases
    if (patternIndex >= patternParts.length) {
      return eventIndex >= eventParts.length
    }

    if (eventIndex >= eventParts.length) {
      return this.areRemainingPartsAllWildcards(patternParts, patternIndex)
    }

    const currentPattern = patternParts[patternIndex]
    const currentEvent = eventParts[eventIndex]

    if (currentPattern === PatternMatcher.GLOBAL_WILDCARD) {
      return this.matchWildcardPart(eventParts, patternParts, eventIndex, patternIndex)
    } else {
      return this.matchExactPart(eventParts, patternParts, eventIndex, patternIndex, currentEvent, currentPattern)
    }
  }

  /**
   * Checks if remaining pattern parts are all wildcards
   * @param patternParts - The pattern parts array
   * @param startIndex - Index to start checking from
   * @returns true if all remaining parts are wildcards
   */
  private areRemainingPartsAllWildcards(patternParts: string[], startIndex: number): boolean {
    for (let i = startIndex; i < patternParts.length; i++) {
      if (patternParts[i] !== PatternMatcher.GLOBAL_WILDCARD) {
        return false
      }
    }
    return true
  }

  /**
   * Matches a wildcard pattern part
   * @param eventParts - The event parts array
   * @param patternParts - The pattern parts array
   * @param eventIndex - Current event index
   * @param patternIndex - Current pattern index
   * @returns true if wildcard matches
   */
  private matchWildcardPart(eventParts: string[], patternParts: string[], eventIndex: number, patternIndex: number): boolean {
    // If this is the last pattern part, it matches all remaining event parts
    if (patternIndex === patternParts.length - 1) {
      return true
    }

    // For suffix patterns like "*.Updated", each * should match exactly one part
    // We need to ensure we have enough event parts remaining to match the rest of the pattern
    const remainingPatternParts = patternParts.length - patternIndex - 1
    const remainingEventParts = eventParts.length - eventIndex

    // If we don't have enough event parts for the remaining pattern parts, fail
    if (remainingEventParts < remainingPatternParts) {
      return false
    }

    // Try matching exactly one event part with this wildcard, then continue with the rest
    if (eventIndex < eventParts.length) {
      return this.matchPatternParts(eventParts, patternParts, eventIndex + 1, patternIndex + 1)
    }

    return false
  }

  /**
   * Matches an exact (non-wildcard) pattern part
   * @param eventParts - The event parts array
   * @param patternParts - The pattern parts array
   * @param eventIndex - Current event index
   * @param patternIndex - Current pattern index
   * @param currentEvent - Current event part
   * @param currentPattern - Current pattern part
   * @returns true if exact match succeeds
   */
  private matchExactPart(eventParts: string[], patternParts: string[], eventIndex: number, patternIndex: number, currentEvent: string, currentPattern: string): boolean {
    if (currentEvent === currentPattern) {
      return this.matchPatternParts(eventParts, patternParts, eventIndex + 1, patternIndex + 1)
    }
    return false
  }
}