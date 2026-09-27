# Database Normalization Guide: 1NF, 2NF, and 3NF

**Project Title**: INVENTORY MANAGEMENT  
**Academic Degree**: B.Tech CSE (Database Management Systems)  
**Database**: MySQL Community Server 26.7 (InnoDB)  
**Scope**: Exact 8-Table Relational Schema  

---

## 1. What is Normalization?

**Normalization** is a formal, systematic technique used in relational database design to organize tables in a way that:
1. **Minimizes Data Redundancy**: Avoids storing the same piece of information in multiple places.
2. **Eliminates Modification Anomalies**:
   - **Insertion Anomaly**: Inability to record certain information without recording unrelated information.
   - **Update Anomaly**: Changing a piece of information requires multiple updates across multiple rows, risking data inconsistency.
   - **Deletion Anomaly**: Deleting one piece of information unintentionally deletes other unrelated, valuable information.
3. **Ensures Logical Data Dependencies**: Enforces that non-key attributes are logically related strictly to primary keys.

---

## 2. First Normal Form (1NF)

### Formal Definition:
A relation is in **First Normal Form (1NF)** if and only if:
1. Every attribute value is **atomic** (single, indivisible value; no comma-separated lists, composite structures, or nested tables).
2. There are **no repeating groups** of columns (e.g., columns named `Product1`, `Product2`, `Product3` in an order table).
3. Each record is unique and identifiable via a designated **Primary Key**.

### Application to Our Database:
- **Atomicity of Columns**:
  - In `Supplier` and `Customer`, attributes such as `Phone`, `Email`, and `Customer_Name` store single scalar values.
  - In `Product`, `Price`, `Stock_Quantity`, and `Reorder_Level` store individual numerical values.
- **Elimination of Repeating Groups via Detail Tables**:
  - In a typical un-normalized purchase record, a single order might look like:
    $$\text{Purchase}(1001, \text{Supplier 1}, \text{"Keyboard, Mouse, HDMI Cable"}, \text{"10, 20, 15"})$$
    Storing comma-separated products or adding columns like `Product_1`, `Product_2`, `Product_3` violates 1NF.
  - **Resolution in our schema**: We decomposed line items into separate child tables: **`Purchase_Details`** and **`Sale_Details`**.
  - Each item purchased or sold occupies its own discrete, atomic row identified by `Purchase_Detail_ID` or `Sale_Detail_ID`.

---

## 3. Second Normal Form (2NF)

### Formal Definition:
A relation is in **Second Normal Form (2NF)** if and only if:
1. It is already in **1NF**.
2. It contains **no partial dependencies**—that is, every non-prime attribute is fully functionally dependent on the *entire* candidate key, not on a subset of a composite primary key.

> *Note*: If a table's primary key consists of a single attribute (simple key), it is automatically in 2NF regarding partial dependencies.

### Application to Our Database:
- **`Product` Table**:
  - Primary Key: `Product_ID` (single attribute).
  - Attributes: `Product_Name`, `Price`, `Stock_Quantity`, `Reorder_Level`, `Category_ID`.
  - Because `Product_ID` is a single-column key, partial key dependencies are mathematically impossible. Every attribute depends on the whole key.
- **`Purchase_Details` Table**:
  - Primary Key: `Purchase_Detail_ID` (surrogate simple key).
  - Even if conceptually modeled with composite key `(Purchase_ID, Product_ID)`:
    - `Quantity`: Represents the exact count procured in *this* purchase for *this* product. It depends on both `Purchase_ID` and `Product_ID`.
    - `Unit_Price`: Represents the specific negotiated procurement cost for *this* product on *this* purchase date. It does not depend solely on `Product_ID` (procurement costs fluctuate over time).
    - Thus, there are no partial dependencies.
- **`Sale_Details` Table**:
  - Primary Key: `Sale_Detail_ID` (simple key).
  - `Quantity` and `Unit_Price` depend on the specific line item of that invoice.

---

## 4. Third Normal Form (3NF)

### Formal Definition:
A relation is in **Third Normal Form (3NF)** if and only if:
1. It is already in **2NF**.
2. It contains **no transitive dependencies** ($X \to Y$ and $Y \to Z$, where $X$ is the primary key and $Y$ and $Z$ are non-key attributes).
3. Simply stated: *"Every non-key attribute must depend on the key, the whole key, and nothing but the key."*

### Application to Our Database:

#### A. Category Separation
- **If un-normalized**: We might store `Category_Name` and `Description` directly inside `Product`:
  $$\text{Product\_ID} \longrightarrow \text{Category\_ID} \longrightarrow \text{Category\_Name}$$
  Here, `Category_Name` depends on `Category_ID`, which is a non-key attribute in `Product`. This is a transitive dependency!
- **Our 3NF Solution**: `Category_Name` and `Description` are factored out into the independent **`Category`** table. `Product` retains only the foreign key `Category_ID`.

#### B. Supplier Separation
- In `Purchase`, only `Supplier_ID` is stored. Supplier contact details (`Supplier_Name`, `Phone`, `Email`, `Address`) reside exclusively in **`Supplier`**.
- If we stored `Supplier_Name` inside `Purchase`, changing a supplier's phone number would require updating hundreds of historical purchase rows (Update Anomaly).

#### C. Customer Separation
- In `Sale`, only `Customer_ID` is stored. Customer details (`Customer_Name`, `Phone`, `Email`, `Address`) reside exclusively in **`Customer`**.

---

## 5. Architectural & Schema Design Decisions

### Q1: Why is `Purchase_Details` required?
In business reality, a single procurement transaction from a vendor contains multiple different products. 
- If we had only a single `Purchase` table without `Purchase_Details`, we would either have to duplicate the purchase header (Supplier, Date, Total) for every product line item (violating 2NF/3NF through massive duplication), or use comma-separated values (violating 1NF).
- `Purchase_Details` acts as the associative entity that resolves the **Many-to-Many (M:N)** relationship between `Purchase` orders and catalog `Product`s.

### Q2: Why is `Sale_Details` required?
Similarly, a customer buying items from a retail inventory typically buys multiple products in a single visit.
- `Sale_Details` cleanly decomposes the M:N relationship between `Sale` invoices and `Product` items into two 1:M relationships:
  $$\text{Sale (1)} \longleftrightarrow \text{Sale\_Details (M)} \longleftrightarrow \text{Product (1)}$$

### Q3: Why is `Supplier_ID` NOT stored in `Product`?
In standard inventory architecture:
- A product is an abstract catalog item (e.g., *"AmazonBasics 2m HDMI Cable"* or *"Dell Optical Mouse"*).
- The company might procure this product from *Apex Infotech Solutions* in August, but reorder it from *Southern Micro Systems* in September depending on pricing and stock availability.
- If `Supplier_ID` were hardcoded into `Product`, a product could only ever have one supplier (forcing a false 1:1 or 1:N relationship), or changing a supplier would corrupt historical records.
- Storing supplier procurement in **`Purchase` $\to$ `Purchase_Details`** correctly reflects commercial reality and preserves normalization.

### Q4: Why is `Category_ID` NOT stored in `Purchase`?
A purchase order contains multiple items (`Purchase_Details`), and each item belongs to a `Product`, which in turn belongs to a `Category`:
$$\text{Purchase\_Detail} \longrightarrow \text{Product} \longrightarrow \text{Category}$$
- If we stored `Category_ID` in `Purchase`, it would create a transitive redundancy.
- Furthermore, a single purchase order often procures items across multiple categories simultaneously (e.g., both Computer Peripherals and Networking Cables). Storing a single Category on the Purchase header would be logically invalid.

### Q5: Why does `Product.Stock_Quantity` act as the authoritative current stock?
- Maintaining current on-hand inventory directly in `Product.Stock_Quantity` provides **$O(1)$ fast retrieval** for customer order fulfillment and low-stock queries.
- Creating a separate `Inventory` or `Stock` table with identical keys would introduce an unnecessary 1:1 relationship with no functional benefit.
- Data integrity is guaranteed via database CHECK constraints (`CHECK (Stock_Quantity >= 0)`) and atomic ACID transactions on `Purchase` (increment) and `Sale` (decrement).

---

## 6. Referential Integrity & Foreign Key Strategy

Our database relies on relational constraints rather than application-only checks:

| Foreign Key | Source Table $\to$ Target Table | `ON DELETE` Rule | Academic & Business Justification |
| :--- | :--- | :--- | :--- |
| `fk_product_category` | `Product(Category_ID) \to Category` | **`RESTRICT`** | Prevents deleting a category if active products belong to it (prevents orphaned products). |
| `fk_purchase_supplier`| `Purchase(Supplier_ID) \to Supplier` | **`RESTRICT`** | Prevents deleting a vendor profile if historical purchase orders exist (audit trail preservation). |
| `fk_purchase_details_purchase` | `Purchase_Details(Purchase_ID) \to Purchase` | **`CASCADE`** | Deleting a purchase header automatically cleans up its child line items. |
| `fk_purchase_details_product` | `Purchase_Details(Product_ID) \to Product` | **`RESTRICT`** | Prevents deleting a product that has historical purchase entries. |
| `fk_sale_customer` | `Sale(Customer_ID) \to Customer` | **`RESTRICT`** | Prevents deleting a customer profile if financial sales invoices reference them. |
| `fk_sale_details_sale` | `Sale_Details(Sale_ID) \to Sale` | **`CASCADE`** | Deleting a sales invoice header cleans up its child line items. |
| `fk_sale_details_product` | `Sale_Details(Product_ID) \to Product` | **`RESTRICT`** | Prevents deleting a product that has historical sales records. |
