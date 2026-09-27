-- ============================================================================
-- Academic DBMS Project: INVENTORY MANAGEMENT
-- Script 02: Create Tables (8 Core Entities)
-- Engine: InnoDB (Supports ACID Transactions, Foreign Keys, Row-Level Locking)
-- ============================================================================

USE inventory_management;

-- Drop child tables first, then parent tables to avoid foreign key conflicts
DROP TABLE IF EXISTS Sale_Details;
DROP TABLE IF EXISTS Sale;
DROP TABLE IF EXISTS Purchase_Details;
DROP TABLE IF EXISTS Purchase;
DROP TABLE IF EXISTS Customer;
DROP TABLE IF EXISTS Supplier;
DROP TABLE IF EXISTS Product;
DROP TABLE IF EXISTS Category;

-- ----------------------------------------------------------------------------
-- 1. Table: Category
-- ----------------------------------------------------------------------------
CREATE TABLE Category (
    Category_ID INT AUTO_INCREMENT,
    Category_Name VARCHAR(100) NOT NULL,
    Description TEXT,
    CONSTRAINT pk_category PRIMARY KEY (Category_ID),
    CONSTRAINT uq_category_name UNIQUE (Category_Name)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2. Table: Product
-- ----------------------------------------------------------------------------
CREATE TABLE Product (
    Product_ID INT AUTO_INCREMENT,
    Product_Name VARCHAR(150) NOT NULL,
    Category_ID INT NOT NULL,
    Price DECIMAL(10, 2) NOT NULL,
    Stock_Quantity INT NOT NULL DEFAULT 0,
    Reorder_Level INT NOT NULL DEFAULT 10,
    CONSTRAINT pk_product PRIMARY KEY (Product_ID)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 3. Table: Supplier
-- ----------------------------------------------------------------------------
CREATE TABLE Supplier (
    Supplier_ID INT AUTO_INCREMENT,
    Supplier_Name VARCHAR(150) NOT NULL,
    Phone VARCHAR(20) NOT NULL,
    Email VARCHAR(100),
    Address TEXT,
    CONSTRAINT pk_supplier PRIMARY KEY (Supplier_ID)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 4. Table: Customer
-- ----------------------------------------------------------------------------
CREATE TABLE Customer (
    Customer_ID INT AUTO_INCREMENT,
    Customer_Name VARCHAR(150) NOT NULL,
    Phone VARCHAR(20) NOT NULL,
    Email VARCHAR(100),
    Address TEXT,
    CONSTRAINT pk_customer PRIMARY KEY (Customer_ID)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 5. Table: Purchase (Transaction Header)
-- ----------------------------------------------------------------------------
CREATE TABLE Purchase (
    Purchase_ID INT AUTO_INCREMENT,
    Supplier_ID INT NOT NULL,
    Purchase_Date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Total_Amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    CONSTRAINT pk_purchase PRIMARY KEY (Purchase_ID)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 6. Table: Purchase_Details (Transaction Line Items)
-- ----------------------------------------------------------------------------
CREATE TABLE Purchase_Details (
    Purchase_Detail_ID INT AUTO_INCREMENT,
    Purchase_ID INT NOT NULL,
    Product_ID INT NOT NULL,
    Quantity INT NOT NULL,
    Unit_Price DECIMAL(10, 2) NOT NULL,
    CONSTRAINT pk_purchase_details PRIMARY KEY (Purchase_Detail_ID)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 7. Table: Sale (Transaction Header)
-- ----------------------------------------------------------------------------
CREATE TABLE Sale (
    Sale_ID INT AUTO_INCREMENT,
    Customer_ID INT NOT NULL,
    Sale_Date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Total_Amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    CONSTRAINT pk_sale PRIMARY KEY (Sale_ID)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 8. Table: Sale_Details (Transaction Line Items)
-- ----------------------------------------------------------------------------
CREATE TABLE Sale_Details (
    Sale_Detail_ID INT AUTO_INCREMENT,
    Sale_ID INT NOT NULL,
    Product_ID INT NOT NULL,
    Quantity INT NOT NULL,
    Unit_Price DECIMAL(10, 2) NOT NULL,
    CONSTRAINT pk_sale_details PRIMARY KEY (Sale_Detail_ID)
) ENGINE=InnoDB;
