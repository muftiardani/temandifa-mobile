package database

import (
	"context"
	"log"

	"github.com/redis/go-redis/v9"
)

var RDB *redis.Client

// Initialize Redis connection
// Addr: "localhost:6379" by default
func ConnectRedis(addr string, password string) {
	RDB = redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password, // no password set
		DB:       0,  // use default DB
	})

	ctx := context.Background()
	_, err := RDB.Ping(ctx).Result()
	if err != nil {
		log.Printf("Warning: Failed to connect to Redis at %s: %v", addr, err)
	} else {
		log.Println("Redis connection established")
	}
}
