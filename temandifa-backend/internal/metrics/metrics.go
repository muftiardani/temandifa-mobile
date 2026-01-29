package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// AIRequestDuration tracks the duration of AI service requests
	AIRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "temandifa_ai_request_duration_seconds",
			Help:    "Duration of AI service requests in seconds",
			Buckets: []float64{0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30},
		},
		[]string{"service", "status", "cache"},
	)

	// AIRequestTotal tracks total number of AI requests
	AIRequestTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "temandifa_ai_request_total",
			Help: "Total number of AI service requests",
		},
		[]string{"service", "status"},
	)

	// CacheHitRatio tracks cache hit ratio
	CacheHits = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "temandifa_cache_hits_total",
			Help: "Total number of cache hits",
		},
		[]string{"operation"},
	)

	// CacheMisses tracks cache misses
	CacheMisses = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "temandifa_cache_misses_total",
			Help: "Total number of cache misses",
		},
		[]string{"operation"},
	)

	// CircuitBreakerState tracks circuit breaker state
	CircuitBreakerState = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "temandifa_circuit_breaker_state",
			Help: "Current state of circuit breaker (0=closed, 1=open, 2=half-open)",
		},
		[]string{"name"},
	)

	// ActiveConnections tracks current active connections
	ActiveConnections = promauto.NewGauge(
		prometheus.GaugeOpts{
			Name: "temandifa_active_connections",
			Help: "Number of active connections",
		},
	)

	// AuthAttempts tracks authentication attempts
	AuthAttempts = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "temandifa_auth_attempts_total",
			Help: "Total number of authentication attempts",
		},
		[]string{"result"}, // success, failed, token_revoked
	)

	// CircuitBreakerRequests tracks requests per circuit breaker state
	CircuitBreakerRequests = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "temandifa_circuit_breaker_requests_total",
			Help: "Total requests through circuit breaker by state",
		},
		[]string{"name", "state", "result"}, // name=ai-service, state=closed/open/half-open, result=success/failure
	)

	// CircuitBreakerFailureRatio tracks the failure ratio
	CircuitBreakerFailureRatio = promauto.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "temandifa_circuit_breaker_failure_ratio",
			Help: "Current failure ratio of circuit breaker (0.0 to 1.0)",
		},
		[]string{"name"},
	)
)

// RecordAIRequest records metrics for an AI service request
func RecordAIRequest(service string, durationSeconds float64, status string, cacheHit bool) {
	cacheStatus := "miss"
	if cacheHit {
		cacheStatus = "hit"
		CacheHits.WithLabelValues(service).Inc()
	} else {
		CacheMisses.WithLabelValues(service).Inc()
	}

	AIRequestDuration.WithLabelValues(service, status, cacheStatus).Observe(durationSeconds)
	AIRequestTotal.WithLabelValues(service, status).Inc()
}

// UpdateCircuitBreakerState updates the circuit breaker state metric
func UpdateCircuitBreakerState(name string, state int) {
	CircuitBreakerState.WithLabelValues(name).Set(float64(state))
}
