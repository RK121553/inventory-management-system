# Relational Database Design: Inventory Management System

**Database Engine**: MySQL Community Server 26.7  
**Storage Engine**: InnoDB (ACID Compliant, Row-Level Locking, Foreign Key Constraints)  
**Database Name**: `inventory_management`  
**Character Set**: `utf8mb4` | **Collation**: `utf8mb4_unicode_ci`  

---

## 1. Text-Based Entity-Relationship Diagram

```
+-----------------------------------------------------------------------------------+
|                                 RELATIONAL MODEL                                  |
+-----------------------------------------------------------------------------------+

       +-------------------------+
       |        CATEGORY         |
       +-------------------------+
       | PK  Category_ID         |
       |     Category_Name       |
       |     Description         |
       +-------------------------+
                    | 1
                    |
                    | M
       +-------------------------+        1:M         +-------------------------+
       |         PRODUCT         |--------------------|    PURCHASE_DETAILS     |
       +-------------------------+                    +-------------------------+
       | PK  Product_ID          |                    | PK  Purchase_Detail_ID  |
       | FK  Category_ID         |                    | FK  Purchase_ID         |
       |     Product_Name        |                    | FK  Product_ID          |
       |     Price               |                    |     Quantity            |
       |     Stock_Quantity      |                    |     Unit_Price          |
       |     Reorder_Level       |                    +-------------------------+
       +-------------------------+                                 | M
                    | 1                                            |
                    |                                              | 1
                    | M                               +-------------------------+
       +-------------------------+                    |        PURCHASE         |
       |      SALE_DETAILS       |                    +-------------------------+
       +-------------------------+                    | PK  Purchase_ID         |
       | PK  Sale_Detail_ID      |                    | FK  Supplier_ID         |
       | FK  Sale_ID             |                    |     Purchase_Date       |
       | FK  Product_ID          |                    |     Total_Amount        |
       |     Quantity            |                    +-------------------------+
       |     Unit_Price          |                                 | M
       +-------------------------+                                 |
                    | M                                            | 1
                    |                                 +-------------------------+
                    | 1                               |        SUPPLIER         |
       +-------------------------+                    +-------------------------+
       |          SALE           |                    | PK  Supplier_ID         |
       +-------------------------+                    |     Supplier_Name       |
       | PK  Sale_ID             |                    |     Phone               |
       | FK  Customer_ID         |                    |     Email               |
       |     Sale_Date           |                    |     Address             |
       |     Total_Amount        |                    +-------------------------+
       +-------------------------+
                    | M
                    |
                    | 1
       +-------------------------+
       |        CUSTOMER         |
       +-------------------------+
       | PK  Customer_ID         |
       |     Customer_Name       |
       |     Phone               |
       |     Email               |
       |     Address             |
       +-------------------------+
```

---

## 2. Table-by-Table Specifications & Relational Constraints

### 1. Table: `Category`
Stores classification groups for inventory products.

| Column | Data Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `Category_ID` | `INT AUTO_INCREMENT` | `PRIMARY KEY` | Unique category identifier |
| `Category_Name`| `VARCHAR(100)` | `NOT NULL, UNIQUE` | Name of the product category |
| `Description` | `TEXT` | `NULL` | Optional details regarding the category |

---

### 2. Table: `Product`
Central catalog storing items, prices, current stock balance, and reorder levels.

| Column | Data Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `Product_ID` | `INT AUTO_INCREMENT` | `PRIMARY KEY` | Unique product identifier |
| `Product_Name` | `VARCHAR(150)` | `NOT NULL` | Descriptive name of the product |
| `Category_ID` | `INT` | `FOREIGN KEY` | References `Category(Category_ID)` |
| `Price` | `DECIMAL(10, 2)` | `NOT NULL, CHECK (Price >= 0)` | Standard unit selling price |
| `Stock_Quantity`| `INT` | `NOT NULL, DEFAULT 0, CHECK (Stock_Quantity >= 0)` | Authoritative current inventory on hand |
| `Reorder_Level` | `INT` | `NOT NULL, DEFAULT 10, CHECK (Reorder_Level >= 0)`| Low-stock threshold |

- **Referential Action**: `ON UPDATE CASCADE ON DELETE RESTRICT` (Category cannot be deleted while products exist).

---

### 3. Table: `Supplier`
Stores vendors providing wholesale inventory goods.

| Column | Data Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `Supplier_ID` | `INT AUTO_INCREMENT` | `PRIMARY KEY` | Unique supplier identifier |
| `Supplier_Name`| `VARCHAR(150)` | `NOT NULL` | Supplier or company name |
| `Phone` | `VARCHAR(20)` | `NOT NULL` | Contact telephone / mobile |
| `Email` | `VARCHAR(100)` | `NULL` | Business contact email |
| `Address` | `TEXT` | `NULL` | Physical business address |

---

### 4. Table: `Customer`
Stores clients who purchase items from the inventory.

| Column | Data Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `Customer_ID` | `INT AUTO_INCREMENT` | `PRIMARY KEY` | Unique customer identifier |
| `Customer_Name`| `VARCHAR(150)` | `NOT NULL` | Full name of the customer |
| `Phone` | `VARCHAR(20)` | `NOT NULL` | Contact mobile number |
| `Email` | `VARCHAR(100)` | `NULL` | Email address |
| `Address` | `TEXT` | `NULL` | Customer residential / billing address |

---

### 5. Table: `Purchase`
Transaction header for vendor replenishment orders.

| Column | Data Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `Purchase_ID` | `INT AUTO_INCREMENT` | `PRIMARY KEY` | Unique purchase order ID |
| `Supplier_ID` | `INT` | `FOREIGN KEY` | References `Supplier(Supplier_ID)` |
| `Purchase_Date`| `DATETIME` | `NOT NULL, DEFAULT CURRENT_TIMESTAMP` | Date and time order was placed |
| `Total_Amount` | `DECIMAL(12, 2)` | `NOT NULL, DEFAULT 0.00, CHECK (Total_Amount >= 0)` | Grand total: $\sum(\text{Quantity} \times \text{Unit\_Price})$ |

- **Referential Action**: `ON UPDATE CASCADE ON DELETE RESTRICT` (Supplier cannot be deleted if purchase history exists).

---

### 6. Table: `Purchase_Details`
Line items for each purchase transaction (M:N decomposition).

| Column | Data Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `Purchase_Detail_ID`| `INT AUTO_INCREMENT` | `PRIMARY KEY` | Unique line item ID |
| `Purchase_ID` | `INT` | `FOREIGN KEY` | References `Purchase(Purchase_ID)` |
| `Product_ID` | `INT` | `FOREIGN KEY` | References `Product(Product_ID)` |
| `Quantity` | `INT` | `NOT NULL, CHECK (Quantity > 0)` | Units procured |
| `Unit_Price` | `DECIMAL(10, 2)` | `NOT NULL, CHECK (Unit_Price >= 0)` | Cost price per unit at procurement |

- **Referential Actions**:
  - `Purchase_ID`: `ON UPDATE CASCADE ON DELETE CASCADE` (Deleting a purchase header removes its line items).
  - `Product_ID`: `ON UPDATE CASCADE ON DELETE RESTRICT` (Product cannot be deleted if referenced in purchases).

---

### 7. Table: `Sale`
Transaction header for customer sales invoices.

| Column | Data Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `Sale_ID` | `INT AUTO_INCREMENT` | `PRIMARY KEY` | Unique sale invoice identifier |
| `Customer_ID` | `INT` | `FOREIGN KEY` | References `Customer(Customer_ID)` |
| `Sale_Date` | `DATETIME` | `NOT NULL, DEFAULT CURRENT_TIMESTAMP` | Date and time sale took place |
| `Total_Amount` | `DECIMAL(12, 2)` | `NOT NULL, DEFAULT 0.00, CHECK (Total_Amount >= 0)` | Grand total: $\sum(\text{Quantity} \times \text{Unit\_Price})$ |

- **Referential Action**: `ON UPDATE CASCADE ON DELETE RESTRICT` (Customer cannot be deleted if sales history exists).

---

### 8. Table: `Sale_Details`
Line items for each sales transaction (M:N decomposition).

| Column | Data Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `Sale_Detail_ID` | `INT AUTO_INCREMENT` | `PRIMARY KEY` | Unique sale line item ID |
| `Sale_ID` | `INT` | `FOREIGN KEY` | References `Sale(Sale_ID)` |
| `Product_ID` | `INT` | `FOREIGN KEY` | References `Product(Product_ID)` |
| `Quantity` | `INT` | `NOT NULL, CHECK (Quantity > 0)` | Units sold |
| `Unit_Price` | `DECIMAL(10, 2)` | `NOT NULL, CHECK (Unit_Price >= 0)` | Selling price per unit at transaction |

- **Referential Actions**:
  - `Sale_ID`: `ON UPDATE CASCADE ON DELETE CASCADE`
  - `Product_ID`: `ON UPDATE CASCADE ON DELETE RESTRICT`

---

## 3. Transaction & Stock Workflows

### A. Purchase Transaction Flow (Stock Inflow)
```text
Client Request: { Supplier_ID: 1, items: [{ Product_ID: 1, Qty: 5, Price: 2000 }, ...] }
       │
       ▼
START TRANSACTION
       │
       ├─► 1. Verify Supplier_ID exists in Supplier table
       ├─► 2. For each item: Verify Product_ID exists in Product table
       ├─► 3. Calculate Total_Amount = SUM(Quantity * Unit_Price)
       ├─► 4. INSERT INTO Purchase (Supplier_ID, Purchase_Date, Total_Amount) VALUES (...)
       ├─► 5. For each item:
       │        ├─► INSERT INTO Purchase_Details (Purchase_ID, Product_ID, Quantity, Unit_Price)
       │        └─► UPDATE Product SET Stock_Quantity = Stock_Quantity + Quantity WHERE Product_ID = ?
       ▼
COMMIT TRANSACTION (If any error occurs: ROLLBACK completely)
```

### B. Sale Transaction Flow (Stock Outflow with Concurrency Guard)
```text
Client Request: { Customer_ID: 1, items: [{ Product_ID: 1, Qty: 3 }, { Product_ID: 4, Qty: 50 }] }
       │
       ▼
START TRANSACTION
       │
       ├─► 1. Verify Customer_ID exists in Customer table
       ├─► 2. Lock required rows: SELECT Stock_Quantity FROM Product WHERE Product_ID = ? FOR UPDATE
       ├─► 3. CRITICAL STOCK SUFFICIENCY CHECK:
       │        Is Requested_Quantity <= Stock_Quantity for EVERY line item?
       │           │
       │           ├─► NO (Any item fails):
       │           │     ROLLBACK;
       │           │     Return HTTP 400: "Insufficient stock available for [Product Name]. Entire sale cancelled."
       │           │     (Zero records committed, zero stocks altered)
       │           │
       │           └─► YES (All items have sufficient stock):
       │                 4. Calculate Total_Amount = SUM(Quantity * Unit_Price)
       │                 5. INSERT INTO Sale (Customer_ID, Sale_Date, Total_Amount) VALUES (...)
       │                 6. For each item:
       │                      ├─► INSERT INTO Sale_Details (Sale_ID, Product_ID, Quantity, Unit_Price)
       │                      └─► UPDATE Product SET Stock_Quantity = Stock_Quantity - Quantity WHERE Product_ID = ?
       ▼
COMMIT TRANSACTION
```

### C. Low-Stock Detection Logic
A product is classified as requiring reordering whenever:
$$\text{Stock\_Quantity} \le \text{Reorder\_Level}$$
The low-stock report computes the shortfall using:
$$\text{Reorder\_Deficit} = \text{Reorder\_Level} - \text{Stock\_Quantity}$$
