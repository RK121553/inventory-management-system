-- ============================================================================
-- Academic DBMS Project: INVENTORY MANAGEMENT
-- Script 03: Constraints (Foreign Keys & Check Constraints)
-- ============================================================================

USE inventory_management;

-- ----------------------------------------------------------------------------
-- SECTION A: FOREIGN KEY CONSTRAINTS
-- ----------------------------------------------------------------------------

-- 1. Product -> Category (A product must belong to a valid category)
ALTER TABLE Product
    ADD CONSTRAINT fk_product_category
    FOREIGN KEY (Category_ID) REFERENCES Category(Category_ID)
    ON UPDATE CASCADE ON DELETE RESTRICT;

-- 2. Purchase -> Supplier (A purchase must be placed with a valid supplier)
ALTER TABLE Purchase
    ADD CONSTRAINT fk_purchase_supplier
    FOREIGN KEY (Supplier_ID) REFERENCES Supplier(Supplier_ID)
    ON UPDATE CASCADE ON DELETE RESTRICT;

-- 3. Purchase_Details -> Purchase (Line item belongs to a parent purchase header)
ALTER TABLE Purchase_Details
    ADD CONSTRAINT fk_purchase_details_purchase
    FOREIGN KEY (Purchase_ID) REFERENCES Purchase(Purchase_ID)
    ON UPDATE CASCADE ON DELETE CASCADE;

-- 4. Purchase_Details -> Product (Line item must reference a valid product)
ALTER TABLE Purchase_Details
    ADD CONSTRAINT fk_purchase_details_product
    FOREIGN KEY (Product_ID) REFERENCES Product(Product_ID)
    ON UPDATE CASCADE ON DELETE RESTRICT;

-- 5. Sale -> Customer (A sale invoice must reference a valid customer)
ALTER TABLE Sale
    ADD CONSTRAINT fk_sale_customer
    FOREIGN KEY (Customer_ID) REFERENCES Customer(Customer_ID)
    ON UPDATE CASCADE ON DELETE RESTRICT;

-- 6. Sale_Details -> Sale (Line item belongs to a parent sale invoice)
ALTER TABLE Sale_Details
    ADD CONSTRAINT fk_sale_details_sale
    FOREIGN KEY (Sale_ID) REFERENCES Sale(Sale_ID)
    ON UPDATE CASCADE ON DELETE CASCADE;

-- 7. Sale_Details -> Product (Line item must reference a valid product)
ALTER TABLE Sale_Details
    ADD CONSTRAINT fk_sale_details_product
    FOREIGN KEY (Product_ID) REFERENCES Product(Product_ID)
    ON UPDATE CASCADE ON DELETE RESTRICT;


-- ----------------------------------------------------------------------------
-- SECTION B: DOMAIN & INTEGRITY CHECK CONSTRAINTS
-- ----------------------------------------------------------------------------

-- Product domain integrity: prices, stock, and reorder levels cannot be negative
ALTER TABLE Product
    ADD CONSTRAINT chk_product_price CHECK (Price >= 0),
    ADD CONSTRAINT chk_product_stock CHECK (Stock_Quantity >= 0),
    ADD CONSTRAINT chk_product_reorder CHECK (Reorder_Level >= 0);

-- Purchase header total cannot be negative
ALTER TABLE Purchase
    ADD CONSTRAINT chk_purchase_total CHECK (Total_Amount >= 0);

-- Purchase line items: quantity must be strictly positive, unit price >= 0
ALTER TABLE Purchase_Details
    ADD CONSTRAINT chk_purchase_detail_qty CHECK (Quantity > 0),
    ADD CONSTRAINT chk_purchase_detail_price CHECK (Unit_Price >= 0);

-- Sale header total cannot be negative
ALTER TABLE Sale
    ADD CONSTRAINT chk_sale_total CHECK (Total_Amount >= 0);

-- Sale line items: quantity must be strictly positive, unit price >= 0
ALTER TABLE Sale_Details
    ADD CONSTRAINT chk_sale_detail_qty CHECK (Quantity > 0),
    ADD CONSTRAINT chk_sale_detail_price CHECK (Unit_Price >= 0);
