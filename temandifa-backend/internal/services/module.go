package services

import "go.uber.org/fx"

var Module = fx.Options(
	// Provide services
	fx.Provide(
		NewAuthService,
		NewAIService,
		NewHistoryService,
		NewTokenService,
		NewCacheService,
		NewUserCacheService,
	),
	// Bind interfaces
	fx.Provide(func(s *authService) AuthService { return s }),
	fx.Provide(func(s *aiService) AIService { return s }),
	fx.Provide(func(s *historyService) HistoryService { return s }),
	// TokenService is already provided as interface by NewTokenService
	fx.Provide(func(s *redisCacheService) CacheService { return s }),
	fx.Provide(func(s *userCacheService) UserCacheService { return s }),
)

