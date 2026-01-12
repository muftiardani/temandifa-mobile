package handlers

import (
	"go.uber.org/fx"
)

var Module = fx.Options(
	fx.Provide(NewAuthHandler),
	fx.Provide(NewHistoryHandler),
	fx.Provide(NewAIProxyHandler),
	fx.Provide(NewHealthHandler),
	fx.Provide(NewCacheHandler),
)
