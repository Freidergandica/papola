-- Migration: Add geolocation columns to stores and orders
-- Run this in Supabase SQL Editor

-- Add latitude/longitude to stores
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add delivery coordinates to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS delivery_longitude DOUBLE PRECISION;

-- Index for spatial queries (optional, useful if you later want to filter by proximity)
CREATE INDEX IF NOT EXISTS idx_stores_coordinates ON stores (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
