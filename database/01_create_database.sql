-- ============================================================================
-- Academic DBMS Project: INVENTORY MANAGEMENT
-- Script 01: Create Database
-- Database: MySQL Community Server 26.7
-- ============================================================================

-- Drop existing database if it already exists to guarantee clean environment
DROP DATABASE IF EXISTS inventory_management;

-- Create the database with UTF-8 character encoding
CREATE DATABASE inventory_management
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Switch to the inventory_management database context
USE inventory_management;

-- Verify database creation
SELECT DATABASE() AS Current_Database, 'Database initialized successfully' AS Status;
