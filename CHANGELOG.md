# Changelog

## [Unreleased]

### Added
- Yield safety mechanism to ensure users always receive at least their original stake back, even in case of negative market performance
- Comprehensive tests for yield safety in different market conditions
- Documentation about market-dependent yield in README.md

### Changed
- Updated yield calculation in NoLossBet contract to handle potential negative yield
- Modified AavePoolMock to support testing with negative yield rates

## [1.0.0] - 2023-07-01

### Added
- Initial release of BetM3 platform
- NoLossBet contract for risk-free social betting
- BetM3Token for rewards
- Integration with Aave for yield generation
- Expiration time for bets (14 days by default)
- Dispute resolution mechanism
- Comprehensive test suite 