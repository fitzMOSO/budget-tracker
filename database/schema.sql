-- Budget Tracker Database Schema
-- SQL Server Database

USE Budget_Tracker_DB;
GO

-- Drop existing tables if they exist (in reverse order of dependencies)
IF OBJECT_ID('SavingsContributions', 'U') IS NOT NULL DROP TABLE SavingsContributions;
IF OBJECT_ID('CreditCardStatements', 'U') IS NOT NULL DROP TABLE CreditCardStatements;
IF OBJECT_ID('Expenses', 'U') IS NOT NULL DROP TABLE Expenses;
IF OBJECT_ID('Incomes', 'U') IS NOT NULL DROP TABLE Incomes;
IF OBJECT_ID('Bills', 'U') IS NOT NULL DROP TABLE Bills;
IF OBJECT_ID('SavingsGoals', 'U') IS NOT NULL DROP TABLE SavingsGoals;
IF OBJECT_ID('CreditCards', 'U') IS NOT NULL DROP TABLE CreditCards;
IF OBJECT_ID('MonthlyBudgets', 'U') IS NOT NULL DROP TABLE MonthlyBudgets;
IF OBJECT_ID('AppSettings', 'U') IS NOT NULL DROP TABLE AppSettings;
IF OBJECT_ID('Categories', 'U') IS NOT NULL DROP TABLE Categories;
GO

-- Categories Table
CREATE TABLE Categories
(
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(100) NOT NULL,
    Type NVARCHAR(20) NOT NULL CHECK (Type IN ('income', 'expense')),
    Color NVARCHAR(20) NOT NULL DEFAULT '#6b7280',
    Icon NVARCHAR(50) NULL,
    IsDefault BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);
GO

-- Income Table
CREATE TABLE Incomes
(
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Description NVARCHAR(255) NOT NULL,
    Amount DECIMAL(18, 2) NOT NULL,
    ExpectedAmount DECIMAL(18, 2) NULL,
    Date DATE NOT NULL,
    CategoryId UNIQUEIDENTIFIER NOT NULL,
    IsRecurring BIT NOT NULL DEFAULT 0,
    Notes NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (CategoryId) REFERENCES Categories(Id)
);
GO

-- Expenses Table
CREATE TABLE Expenses
(
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Description NVARCHAR(255) NOT NULL,
    Amount DECIMAL(18, 2) NOT NULL,
    BudgetAmount DECIMAL(18, 2) NULL,
    Date DATE NOT NULL,
    CategoryId UNIQUEIDENTIFIER NOT NULL,
    ExpenseType NVARCHAR(20) NOT NULL CHECK (ExpenseType IN ('essential', 'non-essential', 'savings')),
    Notes NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (CategoryId) REFERENCES Categories(Id)
);
GO

-- Bills Table
CREATE TABLE Bills
(
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Description NVARCHAR(255) NOT NULL,
    Amount DECIMAL(18, 2) NOT NULL,
    DueDate DATE NOT NULL,
    IsPaid BIT NOT NULL DEFAULT 0,
    PaidDate DATE NULL,
    IsRecurring BIT NOT NULL DEFAULT 0,
    CategoryId UNIQUEIDENTIFIER NULL,
    Notes NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (CategoryId) REFERENCES Categories(Id)
);
GO

-- Credit Cards Table
CREATE TABLE CreditCards
(
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Bank NVARCHAR(100) NOT NULL,
    CardType NVARCHAR(50) NOT NULL,
    CardName NVARCHAR(100) NULL,
    CreditLimit DECIMAL(18, 2) NULL,
    Color NVARCHAR(20) NULL DEFAULT '#3b82f6',
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);
GO

-- Credit Card Statements Table
CREATE TABLE CreditCardStatements
(
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    CreditCardId UNIQUEIDENTIFIER NOT NULL,
    StatementBalance DECIMAL(18, 2) NOT NULL,
    AmountPaid DECIMAL(18, 2) NOT NULL DEFAULT 0,
    DueDate DATE NOT NULL,
    Status NVARCHAR(20) NOT NULL CHECK (Status IN ('pending', 'partial', 'paid', 'overdue')) DEFAULT 'pending',
    PaidDate DATE NULL,
    Notes NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (CreditCardId) REFERENCES CreditCards(Id) ON DELETE CASCADE
);
GO

-- Savings Goals Table
CREATE TABLE SavingsGoals
(
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(100) NOT NULL,
    TargetAmount DECIMAL(18, 2) NOT NULL,
    CurrentAmount DECIMAL(18, 2) NOT NULL DEFAULT 0,
    Deadline DATE NULL,
    Color NVARCHAR(20) NULL DEFAULT '#22c55e',
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);
GO

-- Savings Contributions Table
CREATE TABLE SavingsContributions
(
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    SavingsGoalId UNIQUEIDENTIFIER NOT NULL,
    Amount DECIMAL(18, 2) NOT NULL,
    Date DATE NOT NULL,
    Notes NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (SavingsGoalId) REFERENCES SavingsGoals(Id) ON DELETE CASCADE
);
GO

-- Monthly Budgets Table
CREATE TABLE MonthlyBudgets
(
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Month INT NOT NULL CHECK (Month >= 1 AND Month <= 12),
    Year INT NOT NULL,
    TotalIncome DECIMAL(18, 2) NOT NULL DEFAULT 0,
    EssentialsPercentage DECIMAL(5, 2) NOT NULL DEFAULT 50,
    NonEssentialsPercentage DECIMAL(5, 2) NOT NULL DEFAULT 30,
    SavingsPercentage DECIMAL(5, 2) NOT NULL DEFAULT 20,
    CreatedAt DATETIME2 DEFAULT GETDATE(),
    UpdatedAt DATETIME2 DEFAULT GETDATE(),
    UNIQUE (Month, Year)
);
GO

-- App Settings Table (Single row table)
CREATE TABLE AppSettings
(
    Id INT PRIMARY KEY DEFAULT 1 CHECK (Id = 1),
    Currency NVARCHAR(10) NOT NULL DEFAULT 'PHP',
    CurrencySymbol NVARCHAR(10) NOT NULL DEFAULT N'₱',
    DefaultEssentialsPercentage DECIMAL(5, 2) NOT NULL DEFAULT 50,
    DefaultNonEssentialsPercentage DECIMAL(5, 2) NOT NULL DEFAULT 30,
    DefaultSavingsPercentage DECIMAL(5, 2) NOT NULL DEFAULT 20,
    Theme NVARCHAR(20) NOT NULL DEFAULT 'light' CHECK (Theme IN ('light', 'dark', 'system')),
    UpdatedAt DATETIME2 DEFAULT GETDATE()
);
GO

-- Insert default settings
INSERT INTO AppSettings
    (Id, Currency, CurrencySymbol, DefaultEssentialsPercentage, DefaultNonEssentialsPercentage, DefaultSavingsPercentage, Theme)
VALUES
    (1, 'PHP', N'₱', 50, 30, 20, 'light');
GO

-- Insert default income categories
INSERT INTO Categories
    (Name, Type, Color, IsDefault)
VALUES
    ('Salary', 'income', '#22c55e', 1),
    ('Business', 'income', '#3b82f6', 1),
    ('Freelance', 'income', '#8b5cf6', 1),
    ('Investments', 'income', '#f59e0b', 1),
    ('Other Income', 'income', '#6b7280', 1);
GO

-- Insert default expense categories
INSERT INTO Categories
    (Name, Type, Color, IsDefault)
VALUES
    ('Food & Groceries', 'expense', '#ef4444', 1),
    ('Transportation', 'expense', '#f97316', 1),
    ('Utilities', 'expense', '#eab308', 1),
    ('Rent/Mortgage', 'expense', '#84cc16', 1),
    ('Healthcare', 'expense', '#22c55e', 1),
    ('Insurance', 'expense', '#14b8a6', 1),
    ('Entertainment', 'expense', '#06b6d4', 1),
    ('Shopping', 'expense', '#0ea5e9', 1),
    ('Dining Out', 'expense', '#3b82f6', 1),
    ('Personal Care', 'expense', '#6366f1', 1),
    ('Education', 'expense', '#8b5cf6', 1),
    ('Subscriptions', 'expense', '#a855f7', 1),
    ('Gifts', 'expense', '#d946ef', 1),
    ('Other Expenses', 'expense', '#6b7280', 1);
GO

-- Create indexes for better query performance
CREATE INDEX IX_Incomes_Date ON Incomes(Date);
CREATE INDEX IX_Incomes_CategoryId ON Incomes(CategoryId);
CREATE INDEX IX_Expenses_Date ON Expenses(Date);
CREATE INDEX IX_Expenses_CategoryId ON Expenses(CategoryId);
CREATE INDEX IX_Expenses_ExpenseType ON Expenses(ExpenseType);
CREATE INDEX IX_Bills_DueDate ON Bills(DueDate);
CREATE INDEX IX_Bills_IsPaid ON Bills(IsPaid);
CREATE INDEX IX_CreditCardStatements_CreditCardId ON CreditCardStatements(CreditCardId);
CREATE INDEX IX_CreditCardStatements_DueDate ON CreditCardStatements(DueDate);
CREATE INDEX IX_SavingsContributions_SavingsGoalId ON SavingsContributions(SavingsGoalId);
CREATE INDEX IX_SavingsContributions_Date ON SavingsContributions(Date);
CREATE INDEX IX_MonthlyBudgets_MonthYear ON MonthlyBudgets(Month, Year);
GO

PRINT 'Budget Tracker database schema created successfully!';
GO
