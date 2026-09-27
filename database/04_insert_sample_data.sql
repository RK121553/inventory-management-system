-- ============================================================================
-- Academic DBMS Project: INVENTORY MANAGEMENT
-- Script 04: Insert Realistic Sample Data
-- Indian Context: Genuine names, addresses, phones, and IT/Stationery products
-- Multi-product purchases and multi-product sales with exact header totals
-- ============================================================================

USE inventory_management;

-- Disable foreign key checks temporarily during bulk clean load
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE Sale_Details;
TRUNCATE TABLE Sale;
TRUNCATE TABLE Purchase_Details;
TRUNCATE TABLE Purchase;
TRUNCATE TABLE Customer;
TRUNCATE TABLE Supplier;
TRUNCATE TABLE Product;
TRUNCATE TABLE Category;
SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------------------------
-- 1. Insert Categories
-- ----------------------------------------------------------------------------
INSERT INTO Category (Category_ID, Category_Name, Description) VALUES
(1, 'Computer Peripherals', 'Input and output devices including keyboards, mice, monitors, and webcams'),
(2, 'Storage & Memory', 'Solid state drives, hard disks, USB flash drives, and RAM modules'),
(3, 'Networking Equipment', 'Routers, switches, patch cables, and wireless access points'),
(4, 'Office Stationery & Supplies', 'Printing paper, laser toners, cartridges, and desk accessories'),
(5, 'Power & Protection', 'Uninterruptible power supplies (UPS), surge protectors, and power adapters');

-- ----------------------------------------------------------------------------
-- 2. Insert Products
-- Note: Includes healthy stock items as well as low-stock items (Stock_Quantity <= Reorder_Level)
-- ----------------------------------------------------------------------------
INSERT INTO Product (Product_ID, Product_Name, Category_ID, Price, Stock_Quantity, Reorder_Level) VALUES
-- Category 1: Computer Peripherals
(1, 'Logitech K380 Wireless Keyboard', 1, 2650.00, 28, 8),
(2, 'Dell Optical USB Mouse MS116', 1, 450.00, 45, 12),
(3, 'Logitech C920 HD Pro Webcam', 1, 6800.00, 14, 5),

-- Category 2: Storage & Memory
(4, 'Kingston NV2 1TB M.2 NVMe SSD', 2, 5600.00, 4, 10),      -- LOW STOCK (4 <= 10)
(5, 'Crucial 16GB DDR4 3200MHz RAM', 2, 3400.00, 18, 6),
(6, 'SanDisk Ultra 64GB USB 3.0 Flash Drive', 2, 650.00, 50, 15),

-- Category 3: Networking Equipment
(7, 'TP-Link Archer C6 AC1200 Wi-Fi Router', 3, 2100.00, 3, 5), -- LOW STOCK (3 <= 5)
(8, 'D-Link 8-Port Gigabit Desktop Switch', 3, 1750.00, 12, 4),
(9, 'D-Link Cat6 UTP Ethernet Cable (20 Meter)', 3, 350.00, 5, 15), -- LOW STOCK (5 <= 15)

-- Category 4: Office Stationery & Supplies
(10, 'JK Copier A4 Paper 75 GSM (500 Sheets)', 4, 310.00, 65, 20),
(11, 'HP LaserJet 12A Black Toner Cartridge', 4, 1450.00, 2, 6), -- LOW STOCK (2 <= 6)

-- Category 5: Power & Protection
(12, 'APC Back-UPS 600VA / 360W 230V UPS', 5, 3600.00, 1, 5),  -- LOW STOCK (1 <= 5)
(13, 'AmazonBasics High-Speed 4K HDMI Cable 2m', 5, 290.00, 32, 10),
(14, 'Goldmedal 4+1 Surge Protector Strip', 5, 650.00, 22, 8);

-- ----------------------------------------------------------------------------
-- 3. Insert Suppliers (Authentic Indian IT / Hardware Distributors)
-- ----------------------------------------------------------------------------
INSERT INTO Supplier (Supplier_ID, Supplier_Name, Phone, Email, Address) VALUES
(1, 'Apex Infotech Solutions', '+91 98112 34567', 'sales@apexinfotech.in', 'Building 42, Nehru Place Commercial Complex, New Delhi - 110019'),
(2, 'Bharat Office Technologies', '+91 98201 98765', 'orders@bharatoffice.com', 'Shop 18, Tara Temple Lane, Lamington Road, Mumbai - 400007'),
(3, 'Southern Micro Systems', '+91 98450 11223', 'contact@southernmicro.in', '105 Sadar Patrappa Road (SP Road), Bengaluru - 560002'),
(4, 'Eastern Data Supplies', '+91 98310 44556', 'info@easterndata.co.in', '77 Ganesh Chandra Avenue, Chandni Chowk, Kolkata - 700013'),
(5, 'Deccan Component Hub', '+91 98490 77889', 'support@deccancomponents.in', '204 Chenoy Trade Centre, Park Lane, Secunderabad - 500003');

-- ----------------------------------------------------------------------------
-- 4. Insert Customers (Authentic Indian Businesses & Clients)
-- ----------------------------------------------------------------------------
INSERT INTO Customer (Customer_ID, Customer_Name, Phone, Email, Address) VALUES
(1, 'Rajesh Sharma', '+91 98101 23456', 'rajesh.sharma@delhicorp.in', 'Flat 302, Sector 14, Rohini, New Delhi - 110085'),
(2, 'Priya Sundaram', '+91 98402 34567', 'priya.sundaram@chennaitech.org', '14 North Usman Road, T. Nagar, Chennai - 600017'),
(3, 'Amit Patil', '+91 98220 45678', 'amit.patil@punenetworks.com', '21 FC Road, Shivajinagar, Pune - 411005'),
(4, 'Sneha Mukherjee', '+91 98303 56789', 'sneha.mukherjee@kolkatadesign.in', 'Sector V, Salt Lake City, Bidhannagar, Kolkata - 700091'),
(5, 'Vikram Singh Shekhawat', '+91 98290 67890', 'vikram.singh@jaipursolutions.in', 'Plot 45, Shipra Path, Mansarovar, Jaipur - 302020'),
(6, 'Ananya Reddy', '+91 98480 78901', 'ananya.reddy@hyderabadsys.com', 'Road No. 12, Banjara Hills, Hyderabad - 500034');

-- ----------------------------------------------------------------------------
-- 5. Insert Purchases (Transaction Headers)
-- Total_Amount equals the sum of (Quantity * Unit_Price) of line items
-- ----------------------------------------------------------------------------
INSERT INTO Purchase (Purchase_ID, Supplier_ID, Purchase_Date, Total_Amount) VALUES
(1001, 1, '2026-08-10 10:30:00', 31700.00), -- Multi-product: Items 1, 2, 13
(1002, 3, '2026-08-15 14:15:00', 57600.00), -- Multi-product: Items 4, 5
(1003, 2, '2026-08-20 11:00:00', 20800.00), -- Multi-product: Items 10, 11
(1004, 4, '2026-08-28 16:45:00', 25100.00), -- Multi-product: Items 7, 8, 9
(1005, 5, '2026-09-05 09:20:00', 18350.00); -- Multi-product: Items 12, 14

-- ----------------------------------------------------------------------------
-- 6. Insert Purchase Details (Line Items for Each Multi-Product Purchase)
-- ----------------------------------------------------------------------------
-- Purchase 1001 (Apex Infotech): 3 distinct products
INSERT INTO Purchase_Details (Purchase_Detail_ID, Purchase_ID, Product_ID, Quantity, Unit_Price) VALUES
(1, 1001, 1,  10, 2200.00), -- 10 * 2200 = 22,000.00 (Logitech Keyboard)
(2, 1001, 2,  20,  350.00), -- 20 *  350 =  7,000.00 (Dell Mouse)
(3, 1001, 13, 15,  180.00); -- 15 *  180 =  2,700.00 (HDMI Cable)
-- Sum = 22000 + 7000 + 2700 = 31,700.00

-- Purchase 1002 (Southern Micro): 2 distinct products
INSERT INTO Purchase_Details (Purchase_Detail_ID, Purchase_ID, Product_ID, Quantity, Unit_Price) VALUES
(4, 1002, 4,   5, 4800.00), --  5 * 4800 = 24,000.00 (1TB NVMe SSD)
(5, 1002, 5,  12, 2800.00); -- 12 * 2800 = 33,600.00 (16GB RAM)
-- Sum = 24000 + 33600 = 57,600.00

-- Purchase 1003 (Bharat Office): 2 distinct products
INSERT INTO Purchase_Details (Purchase_Detail_ID, Purchase_ID, Product_ID, Quantity, Unit_Price) VALUES
(6, 1003, 10, 50,  240.00), -- 50 *  240 = 12,000.00 (A4 Paper)
(7, 1003, 11,  8, 1100.00); --  8 * 1100 =  8,800.00 (HP Toner 12A)
-- Sum = 12000 + 8800 = 20,800.00

-- Purchase 1004 (Eastern Data): 3 distinct products
INSERT INTO Purchase_Details (Purchase_Detail_ID, Purchase_ID, Product_ID, Quantity, Unit_Price) VALUES
(8,  1004, 7,  6, 1650.00), --  6 * 1650 =  9,900.00 (TP-Link Router)
(9,  1004, 8,  8, 1350.00), --  8 * 1350 = 10,800.00 (8-Port Switch)
(10, 1004, 9, 20,  220.00); -- 20 *  220 =  4,400.00 (Cat6 Cable)
-- Sum = 9900 + 10800 + 4400 = 25,100.00

-- Purchase 1005 (Deccan Components): 2 distinct products
INSERT INTO Purchase_Details (Purchase_Detail_ID, Purchase_ID, Product_ID, Quantity, Unit_Price) VALUES
(11, 1005, 12,  4, 2900.00), --  4 * 2900 = 11,600.00 (APC UPS)
(12, 1005, 14, 15,  450.00); -- 15 *  450 =  6,750.00 (Surge Protector)
-- Sum = 11600 + 6750 = 18,350.00

-- ----------------------------------------------------------------------------
-- 7. Insert Sales (Transaction Headers)
-- Total_Amount equals the sum of (Quantity * Unit_Price) of line items
-- ----------------------------------------------------------------------------
INSERT INTO Sale (Sale_ID, Customer_ID, Sale_Date, Total_Amount) VALUES
(5001, 1, '2026-08-12 11:20:00',  7600.00), -- Multi-product: Items 1, 2, 13
(5002, 2, '2026-08-18 15:40:00', 24800.00), -- Multi-product: Items 4, 5
(5003, 3, '2026-08-25 12:10:00',  6000.00), -- Multi-product: Items 10, 11
(5004, 4, '2026-09-02 17:30:00',  3150.00), -- Multi-product: Items 7, 9
(5005, 5, '2026-09-10 10:00:00',  4900.00); -- Multi-product: Items 12, 14

-- ----------------------------------------------------------------------------
-- 8. Insert Sale Details (Line Items for Each Multi-Product Sale)
-- ----------------------------------------------------------------------------
-- Sale 5001 (Rajesh Sharma): 3 distinct products
INSERT INTO Sale_Details (Sale_Detail_ID, Sale_ID, Product_ID, Quantity, Unit_Price) VALUES
(1, 5001, 1,  2, 2650.00), -- 2 * 2650 = 5,300.00 (Logitech Keyboard)
(2, 5001, 2,  4,  450.00), -- 4 *  450 = 1,800.00 (Dell Mouse)
(3, 5001, 13, 2,  250.00); -- 2 *  250 =   500.00 (HDMI Cable)
-- Sum = 5300 + 1800 + 500 = 7,600.00

-- Sale 5002 (Priya Sundaram): 2 distinct products
INSERT INTO Sale_Details (Sale_Detail_ID, Sale_ID, Product_ID, Quantity, Unit_Price) VALUES
(4, 5002, 4, 2, 5600.00), -- 2 * 5600 = 11,200.00 (1TB NVMe SSD)
(5, 5002, 5, 4, 3400.00); -- 4 * 3400 = 13,600.00 (16GB RAM)
-- Sum = 11200 + 13600 = 24,800.00

-- Sale 5003 (Amit Patil): 2 distinct products
INSERT INTO Sale_Details (Sale_Detail_ID, Sale_ID, Product_ID, Quantity, Unit_Price) VALUES
(6, 5003, 10, 10,  310.00), -- 10 *  310 = 3,100.00 (A4 Paper)
(7, 5003, 11,  2, 1450.00); --  2 * 1450 = 2,900.00 (HP Toner 12A)
-- Sum = 3100 + 2900 = 6,000.00

-- Sale 5004 (Sneha Mukherjee): 2 distinct products
INSERT INTO Sale_Details (Sale_Detail_ID, Sale_ID, Product_ID, Quantity, Unit_Price) VALUES
(8, 5004, 7, 1, 2100.00), -- 1 * 2100 = 2,100.00 (TP-Link Router)
(9, 5004, 9, 3,  350.00); -- 3 *  350 = 1,050.00 (Cat6 Cable)
-- Sum = 2100 + 1050 = 3,150.00

-- Sale 5005 (Vikram Singh Shekhawat): 2 distinct products
INSERT INTO Sale_Details (Sale_Detail_ID, Sale_ID, Product_ID, Quantity, Unit_Price) VALUES
(10, 5005, 12, 1, 3600.00), -- 1 * 3600 = 3,600.00 (APC UPS)
(11, 5005, 14, 2,  650.00); -- 2 *  650 = 1,300.00 (Surge Protector)
-- Sum = 3600 + 1300 = 4,900.00
