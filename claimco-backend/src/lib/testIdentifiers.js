/**
 * Test identifiers for automated E2E testing.
 * ONLY used in non-production environments.
 *
 * These identifiers bypass code generation and always verify with the fixed code.
 * This allows reliable E2E testing without actual email sending or timing issues.
 *
 * Rules:
 * - Only active when NODE_ENV !== 'production'
 * - Never bypass uniqueness/domain checks differently than real identifiers
 * - Only the code value is fixed; everything else runs normal logic
 */

const TEST_IDENTIFIERS = {
    'test.student@brown.edu': '000000',
    'test1.student@brown.edu': '111111',
    'test2.student@brown.edu': '222222',
    'test3.student@brown.edu': '333333',
    'test4.student@brown.edu': '444444',
    'test5.student@brown.edu': '555555',
    'test6.student@brown.edu': '666666',
    'test7.student@brown.edu': '777777',
    'test8.student@brown.edu': '888888',
    'test9.student@brown.edu': '999999',
    'test10.student@brown.edu': '101010',
};

module.exports = TEST_IDENTIFIERS;
