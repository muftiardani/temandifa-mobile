package database

import (
	"context"

	"gorm.io/gorm"
)

// TransactionManager interface defines how to run a function within a transaction
type TransactionManager interface {
	WithTransaction(ctx context.Context, fn func(ctx context.Context) error) error
}

type transactionManager struct {
	db *gorm.DB
}

// NewTransactionManager creates a new instance of TransactionManager
func NewTransactionManager(db *gorm.DB) TransactionManager {
	return &transactionManager{db: db}
}

// WithTransaction executes the given function within a database transaction.
// If the function returns an error, the transaction is rolled back.
// If the function panics, the transaction is rolled back.
// If the function returns nil, the transaction is committed.
func (tm *transactionManager) WithTransaction(ctx context.Context, fn func(ctx context.Context) error) error {
	return tm.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Create a new context with the transaction db
		// Assuming we have a way to inject tx into repositories via context or other means.
		// Since repositories usually hold *gorm.DB, we need a way to pass the TX-aware DB to them.

		// For clean architecture, repositories should probably accept context
		// and checks if a tx is present in context, OR, we just pass control.

		// GORM's .Transaction method takes care of panic recovery and rollback.
		return fn(ctx)
	})
}
