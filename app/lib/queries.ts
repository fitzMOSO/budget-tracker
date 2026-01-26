import { getConnection, sql } from './db';
import type {
  Category,
  Income,
  Expense,
  Bill,
  CreditCard,
  CreditCardStatement,
  SavingsGoal,
  SavingsContribution,
  MonthlyBudget,
  AppSettings,
} from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRow = Record<string, any>;

// ==================== CATEGORIES ====================

export async function getCategories(): Promise<Category[]> {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT Id as id, Name as name, Type as type, Color as color, Icon as icon, IsDefault as isDefault
    FROM Categories
    ORDER BY IsDefault DESC, Name
  `);
  return result.recordset.map((row: DbRow) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    color: row.color,
    icon: row.icon,
    isDefault: Boolean(row.isDefault),
  }));
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query(
      `SELECT Id as id, Name as name, Type as type, Color as color, Icon as icon, IsDefault as isDefault FROM Categories WHERE Id = @id`
    );
  return result.recordset[0] || null;
}

export async function createCategory(
  category: Omit<Category, 'id'>
): Promise<Category> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('name', sql.NVarChar(100), category.name)
    .input('type', sql.NVarChar(20), category.type)
    .input('color', sql.NVarChar(20), category.color)
    .input('icon', sql.NVarChar(50), category.icon || null)
    .input('isDefault', sql.Bit, category.isDefault || false).query(`
      INSERT INTO Categories (Name, Type, Color, Icon, IsDefault)
      OUTPUT INSERTED.Id as id, INSERTED.Name as name, INSERTED.Type as type, 
             INSERTED.Color as color, INSERTED.Icon as icon, INSERTED.IsDefault as isDefault
      VALUES (@name, @type, @color, @icon, @isDefault)
    `);
  return result.recordset[0];
}

export async function updateCategory(
  id: string,
  category: Partial<Category>
): Promise<Category | null> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .input('name', sql.NVarChar(100), category.name)
    .input('color', sql.NVarChar(20), category.color)
    .input('icon', sql.NVarChar(50), category.icon || null).query(`
      UPDATE Categories SET Name = @name, Color = @color, Icon = @icon, UpdatedAt = GETDATE()
      OUTPUT INSERTED.Id as id, INSERTED.Name as name, INSERTED.Type as type, 
             INSERTED.Color as color, INSERTED.Icon as icon, INSERTED.IsDefault as isDefault
      WHERE Id = @id
    `);
  return result.recordset[0] || null;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query(`DELETE FROM Categories WHERE Id = @id AND IsDefault = 0`);
  return result.rowsAffected[0] > 0;
}

// ==================== INCOMES ====================

export async function getIncomes(): Promise<Income[]> {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT Id as id, Description as description, Amount as amount, ExpectedAmount as expectedAmount,
           Date as date, CategoryId as categoryId, IsRecurring as isRecurring, Notes as notes
    FROM Incomes
    ORDER BY Date DESC
  `);
  return result.recordset.map((row) => ({
    ...row,
    amount: parseFloat(row.amount),
    expectedAmount: row.expectedAmount ? parseFloat(row.expectedAmount) : undefined,
    date: row.date.toISOString().split('T')[0],
    isRecurring: Boolean(row.isRecurring),
  }));
}

export async function getIncomesByMonth(
  month: number,
  year: number
): Promise<Income[]> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('month', sql.Int, month)
    .input('year', sql.Int, year).query(`
      SELECT Id as id, Description as description, Amount as amount, ExpectedAmount as expectedAmount,
             Date as date, CategoryId as categoryId, IsRecurring as isRecurring, Notes as notes
      FROM Incomes
      WHERE MONTH(Date) = @month AND YEAR(Date) = @year
      ORDER BY Date DESC
    `);
  return result.recordset.map((row) => ({
    ...row,
    amount: parseFloat(row.amount),
    expectedAmount: row.expectedAmount ? parseFloat(row.expectedAmount) : undefined,
    date: row.date.toISOString().split('T')[0],
    isRecurring: Boolean(row.isRecurring),
  }));
}

export async function createIncome(income: Omit<Income, 'id'>): Promise<Income> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('description', sql.NVarChar(255), income.description)
    .input('amount', sql.Decimal(18, 2), income.amount)
    .input('expectedAmount', sql.Decimal(18, 2), income.expectedAmount || null)
    .input('date', sql.Date, income.date)
    .input('categoryId', sql.UniqueIdentifier, income.categoryId)
    .input('isRecurring', sql.Bit, income.isRecurring || false)
    .input('notes', sql.NVarChar(sql.MAX), income.notes || null).query(`
      INSERT INTO Incomes (Description, Amount, ExpectedAmount, Date, CategoryId, IsRecurring, Notes)
      OUTPUT INSERTED.Id as id, INSERTED.Description as description, INSERTED.Amount as amount,
             INSERTED.ExpectedAmount as expectedAmount, INSERTED.Date as date,
             INSERTED.CategoryId as categoryId, INSERTED.IsRecurring as isRecurring, INSERTED.Notes as notes
      VALUES (@description, @amount, @expectedAmount, @date, @categoryId, @isRecurring, @notes)
    `);
  const row = result.recordset[0];
  return {
    ...row,
    amount: parseFloat(row.amount),
    expectedAmount: row.expectedAmount ? parseFloat(row.expectedAmount) : undefined,
    date: row.date.toISOString().split('T')[0],
    isRecurring: Boolean(row.isRecurring),
  };
}

export async function updateIncome(
  id: string,
  income: Partial<Income>
): Promise<Income | null> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .input('description', sql.NVarChar(255), income.description)
    .input('amount', sql.Decimal(18, 2), income.amount)
    .input('expectedAmount', sql.Decimal(18, 2), income.expectedAmount || null)
    .input('date', sql.Date, income.date)
    .input('categoryId', sql.UniqueIdentifier, income.categoryId)
    .input('isRecurring', sql.Bit, income.isRecurring || false)
    .input('notes', sql.NVarChar(sql.MAX), income.notes || null).query(`
      UPDATE Incomes SET Description = @description, Amount = @amount, ExpectedAmount = @expectedAmount,
             Date = @date, CategoryId = @categoryId, IsRecurring = @isRecurring, Notes = @notes, UpdatedAt = GETDATE()
      OUTPUT INSERTED.Id as id, INSERTED.Description as description, INSERTED.Amount as amount,
             INSERTED.ExpectedAmount as expectedAmount, INSERTED.Date as date,
             INSERTED.CategoryId as categoryId, INSERTED.IsRecurring as isRecurring, INSERTED.Notes as notes
      WHERE Id = @id
    `);
  if (!result.recordset[0]) return null;
  const row = result.recordset[0];
  return {
    ...row,
    amount: parseFloat(row.amount),
    expectedAmount: row.expectedAmount ? parseFloat(row.expectedAmount) : undefined,
    date: row.date.toISOString().split('T')[0],
    isRecurring: Boolean(row.isRecurring),
  };
}

export async function deleteIncome(id: string): Promise<boolean> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query(`DELETE FROM Incomes WHERE Id = @id`);
  return result.rowsAffected[0] > 0;
}

// ==================== EXPENSES ====================

export async function getExpenses(): Promise<Expense[]> {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT Id as id, Description as description, Amount as amount, BudgetAmount as budgetAmount,
           Date as date, CategoryId as categoryId, ExpenseType as expenseType, Notes as notes
    FROM Expenses
    ORDER BY Date DESC
  `);
  return result.recordset.map((row) => ({
    ...row,
    amount: parseFloat(row.amount),
    budgetAmount: row.budgetAmount ? parseFloat(row.budgetAmount) : undefined,
    date: row.date.toISOString().split('T')[0],
  }));
}

export async function getExpensesByMonth(
  month: number,
  year: number
): Promise<Expense[]> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('month', sql.Int, month)
    .input('year', sql.Int, year).query(`
      SELECT Id as id, Description as description, Amount as amount, BudgetAmount as budgetAmount,
             Date as date, CategoryId as categoryId, ExpenseType as expenseType, Notes as notes
      FROM Expenses
      WHERE MONTH(Date) = @month AND YEAR(Date) = @year
      ORDER BY Date DESC
    `);
  return result.recordset.map((row) => ({
    ...row,
    amount: parseFloat(row.amount),
    budgetAmount: row.budgetAmount ? parseFloat(row.budgetAmount) : undefined,
    date: row.date.toISOString().split('T')[0],
  }));
}

export async function createExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('description', sql.NVarChar(255), expense.description)
    .input('amount', sql.Decimal(18, 2), expense.amount)
    .input('budgetAmount', sql.Decimal(18, 2), expense.budgetAmount || null)
    .input('date', sql.Date, expense.date)
    .input('categoryId', sql.UniqueIdentifier, expense.categoryId)
    .input('expenseType', sql.NVarChar(20), expense.expenseType)
    .input('notes', sql.NVarChar(sql.MAX), expense.notes || null).query(`
      INSERT INTO Expenses (Description, Amount, BudgetAmount, Date, CategoryId, ExpenseType, Notes)
      OUTPUT INSERTED.Id as id, INSERTED.Description as description, INSERTED.Amount as amount,
             INSERTED.BudgetAmount as budgetAmount, INSERTED.Date as date,
             INSERTED.CategoryId as categoryId, INSERTED.ExpenseType as expenseType, INSERTED.Notes as notes
      VALUES (@description, @amount, @budgetAmount, @date, @categoryId, @expenseType, @notes)
    `);
  const row = result.recordset[0];
  return {
    ...row,
    amount: parseFloat(row.amount),
    budgetAmount: row.budgetAmount ? parseFloat(row.budgetAmount) : undefined,
    date: row.date.toISOString().split('T')[0],
  };
}

export async function updateExpense(
  id: string,
  expense: Partial<Expense>
): Promise<Expense | null> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .input('description', sql.NVarChar(255), expense.description)
    .input('amount', sql.Decimal(18, 2), expense.amount)
    .input('budgetAmount', sql.Decimal(18, 2), expense.budgetAmount || null)
    .input('date', sql.Date, expense.date)
    .input('categoryId', sql.UniqueIdentifier, expense.categoryId)
    .input('expenseType', sql.NVarChar(20), expense.expenseType)
    .input('notes', sql.NVarChar(sql.MAX), expense.notes || null).query(`
      UPDATE Expenses SET Description = @description, Amount = @amount, BudgetAmount = @budgetAmount,
             Date = @date, CategoryId = @categoryId, ExpenseType = @expenseType, Notes = @notes, UpdatedAt = GETDATE()
      OUTPUT INSERTED.Id as id, INSERTED.Description as description, INSERTED.Amount as amount,
             INSERTED.BudgetAmount as budgetAmount, INSERTED.Date as date,
             INSERTED.CategoryId as categoryId, INSERTED.ExpenseType as expenseType, INSERTED.Notes as notes
      WHERE Id = @id
    `);
  if (!result.recordset[0]) return null;
  const row = result.recordset[0];
  return {
    ...row,
    amount: parseFloat(row.amount),
    budgetAmount: row.budgetAmount ? parseFloat(row.budgetAmount) : undefined,
    date: row.date.toISOString().split('T')[0],
  };
}

export async function deleteExpense(id: string): Promise<boolean> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query(`DELETE FROM Expenses WHERE Id = @id`);
  return result.rowsAffected[0] > 0;
}

// ==================== BILLS ====================

export async function getBills(): Promise<Bill[]> {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT Id as id, Description as description, Amount as amount, DueDate as dueDate,
           IsPaid as isPaid, PaidDate as paidDate, IsRecurring as isRecurring,
           CategoryId as categoryId, Notes as notes
    FROM Bills
    ORDER BY DueDate
  `);
  return result.recordset.map((row) => ({
    ...row,
    amount: parseFloat(row.amount),
    dueDate: row.dueDate.toISOString().split('T')[0],
    paidDate: row.paidDate ? row.paidDate.toISOString().split('T')[0] : undefined,
    isPaid: Boolean(row.isPaid),
    isRecurring: Boolean(row.isRecurring),
  }));
}

export async function getBillsByMonth(month: number, year: number): Promise<Bill[]> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('month', sql.Int, month)
    .input('year', sql.Int, year).query(`
      SELECT Id as id, Description as description, Amount as amount, DueDate as dueDate,
             IsPaid as isPaid, PaidDate as paidDate, IsRecurring as isRecurring,
             CategoryId as categoryId, Notes as notes
      FROM Bills
      WHERE MONTH(DueDate) = @month AND YEAR(DueDate) = @year
      ORDER BY DueDate
    `);
  return result.recordset.map((row) => ({
    ...row,
    amount: parseFloat(row.amount),
    dueDate: row.dueDate.toISOString().split('T')[0],
    paidDate: row.paidDate ? row.paidDate.toISOString().split('T')[0] : undefined,
    isPaid: Boolean(row.isPaid),
    isRecurring: Boolean(row.isRecurring),
  }));
}

export async function createBill(bill: Omit<Bill, 'id'>): Promise<Bill> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('description', sql.NVarChar(255), bill.description)
    .input('amount', sql.Decimal(18, 2), bill.amount)
    .input('dueDate', sql.Date, bill.dueDate)
    .input('isPaid', sql.Bit, bill.isPaid || false)
    .input('paidDate', sql.Date, bill.paidDate || null)
    .input('isRecurring', sql.Bit, bill.isRecurring || false)
    .input('categoryId', sql.UniqueIdentifier, bill.categoryId || null)
    .input('notes', sql.NVarChar(sql.MAX), bill.notes || null).query(`
      INSERT INTO Bills (Description, Amount, DueDate, IsPaid, PaidDate, IsRecurring, CategoryId, Notes)
      OUTPUT INSERTED.Id as id, INSERTED.Description as description, INSERTED.Amount as amount,
             INSERTED.DueDate as dueDate, INSERTED.IsPaid as isPaid, INSERTED.PaidDate as paidDate,
             INSERTED.IsRecurring as isRecurring, INSERTED.CategoryId as categoryId, INSERTED.Notes as notes
      VALUES (@description, @amount, @dueDate, @isPaid, @paidDate, @isRecurring, @categoryId, @notes)
    `);
  const row = result.recordset[0];
  return {
    ...row,
    amount: parseFloat(row.amount),
    dueDate: row.dueDate.toISOString().split('T')[0],
    paidDate: row.paidDate ? row.paidDate.toISOString().split('T')[0] : undefined,
    isPaid: Boolean(row.isPaid),
    isRecurring: Boolean(row.isRecurring),
  };
}

export async function updateBill(id: string, bill: Partial<Bill>): Promise<Bill | null> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .input('description', sql.NVarChar(255), bill.description)
    .input('amount', sql.Decimal(18, 2), bill.amount)
    .input('dueDate', sql.Date, bill.dueDate)
    .input('isPaid', sql.Bit, bill.isPaid || false)
    .input('paidDate', sql.Date, bill.paidDate || null)
    .input('isRecurring', sql.Bit, bill.isRecurring || false)
    .input('categoryId', sql.UniqueIdentifier, bill.categoryId || null)
    .input('notes', sql.NVarChar(sql.MAX), bill.notes || null).query(`
      UPDATE Bills SET Description = @description, Amount = @amount, DueDate = @dueDate,
             IsPaid = @isPaid, PaidDate = @paidDate, IsRecurring = @isRecurring,
             CategoryId = @categoryId, Notes = @notes, UpdatedAt = GETDATE()
      OUTPUT INSERTED.Id as id, INSERTED.Description as description, INSERTED.Amount as amount,
             INSERTED.DueDate as dueDate, INSERTED.IsPaid as isPaid, INSERTED.PaidDate as paidDate,
             INSERTED.IsRecurring as isRecurring, INSERTED.CategoryId as categoryId, INSERTED.Notes as notes
      WHERE Id = @id
    `);
  if (!result.recordset[0]) return null;
  const row = result.recordset[0];
  return {
    ...row,
    amount: parseFloat(row.amount),
    dueDate: row.dueDate.toISOString().split('T')[0],
    paidDate: row.paidDate ? row.paidDate.toISOString().split('T')[0] : undefined,
    isPaid: Boolean(row.isPaid),
    isRecurring: Boolean(row.isRecurring),
  };
}

export async function deleteBill(id: string): Promise<boolean> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query(`DELETE FROM Bills WHERE Id = @id`);
  return result.rowsAffected[0] > 0;
}

// ==================== CREDIT CARDS ====================

export async function getCreditCards(): Promise<CreditCard[]> {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT Id as id, Bank as bank, CardType as cardType, CardName as cardName,
           CreditLimit as creditLimit, CurrentAvailableLimit as currentAvailableLimit, Color as color
    FROM CreditCards
    ORDER BY Bank, CardName
  `);
  return result.recordset.map((row: DbRow) => ({
    id: row.id,
    bank: row.bank,
    cardType: row.cardType,
    cardName: row.cardName,
    creditLimit: row.creditLimit ? parseFloat(row.creditLimit) : undefined,
    currentAvailableLimit: row.currentAvailableLimit ? parseFloat(row.currentAvailableLimit) : undefined,
    color: row.color,
  }));
}

export async function createCreditCard(
  card: Omit<CreditCard, 'id'>
): Promise<CreditCard> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('bank', sql.NVarChar(100), card.bank)
    .input('cardType', sql.NVarChar(50), card.cardType)
    .input('cardName', sql.NVarChar(100), card.cardName || null)
    .input('creditLimit', sql.Decimal(18, 2), card.creditLimit || null)
    .input('currentAvailableLimit', sql.Decimal(18, 2), card.currentAvailableLimit || null)
    .input('color', sql.NVarChar(20), card.color || '#3b82f6').query(`
      INSERT INTO CreditCards (Bank, CardType, CardName, CreditLimit, CurrentAvailableLimit, Color)
      OUTPUT INSERTED.Id as id, INSERTED.Bank as bank, INSERTED.CardType as cardType,
             INSERTED.CardName as cardName, INSERTED.CreditLimit as creditLimit, 
             INSERTED.CurrentAvailableLimit as currentAvailableLimit, INSERTED.Color as color
      VALUES (@bank, @cardType, @cardName, @creditLimit, @currentAvailableLimit, @color)
    `);
  const row = result.recordset[0];
  return {
    id: row.id,
    bank: row.bank,
    cardType: row.cardType,
    cardName: row.cardName,
    creditLimit: row.creditLimit ? parseFloat(row.creditLimit) : undefined,
    currentAvailableLimit: row.currentAvailableLimit ? parseFloat(row.currentAvailableLimit) : undefined,
    color: row.color,
  };
}

export async function updateCreditCard(
  id: string,
  card: Partial<CreditCard>
): Promise<CreditCard | null> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .input('bank', sql.NVarChar(100), card.bank)
    .input('cardType', sql.NVarChar(50), card.cardType)
    .input('cardName', sql.NVarChar(100), card.cardName || null)
    .input('creditLimit', sql.Decimal(18, 2), card.creditLimit || null)
    .input('currentAvailableLimit', sql.Decimal(18, 2), card.currentAvailableLimit || null)
    .input('color', sql.NVarChar(20), card.color || '#3b82f6').query(`
      UPDATE CreditCards SET Bank = @bank, CardType = @cardType, CardName = @cardName,
             CreditLimit = @creditLimit, CurrentAvailableLimit = @currentAvailableLimit, 
             Color = @color, UpdatedAt = GETDATE()
      OUTPUT INSERTED.Id as id, INSERTED.Bank as bank, INSERTED.CardType as cardType,
             INSERTED.CardName as cardName, INSERTED.CreditLimit as creditLimit, 
             INSERTED.CurrentAvailableLimit as currentAvailableLimit, INSERTED.Color as color
      WHERE Id = @id
    `);
  if (!result.recordset[0]) return null;
  const row = result.recordset[0];
  return {
    id: row.id,
    bank: row.bank,
    cardType: row.cardType,
    cardName: row.cardName,
    creditLimit: row.creditLimit ? parseFloat(row.creditLimit) : undefined,
    currentAvailableLimit: row.currentAvailableLimit ? parseFloat(row.currentAvailableLimit) : undefined,
    color: row.color,
  };
}

export async function deleteCreditCard(id: string): Promise<boolean> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query(`DELETE FROM CreditCards WHERE Id = @id`);
  return result.rowsAffected[0] > 0;
}

// ==================== CREDIT CARD STATEMENTS ====================

export async function getCreditCardStatements(): Promise<CreditCardStatement[]> {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT Id as id, CreditCardId as creditCardId, StatementBalance as statementBalance,
           AmountPaid as amountPaid, DueDate as dueDate, Status as status,
           PaidDate as paidDate, Notes as notes
    FROM CreditCardStatements
    ORDER BY DueDate DESC
  `);
  return result.recordset.map((row) => ({
    ...row,
    statementBalance: parseFloat(row.statementBalance),
    amountPaid: parseFloat(row.amountPaid),
    dueDate: row.dueDate.toISOString().split('T')[0],
    paidDate: row.paidDate ? row.paidDate.toISOString().split('T')[0] : undefined,
  }));
}

export async function getCreditCardStatementsByMonth(
  month: number,
  year: number
): Promise<CreditCardStatement[]> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('month', sql.Int, month)
    .input('year', sql.Int, year).query(`
      SELECT Id as id, CreditCardId as creditCardId, StatementBalance as statementBalance,
             AmountPaid as amountPaid, DueDate as dueDate, Status as status,
             PaidDate as paidDate, Notes as notes
      FROM CreditCardStatements
      WHERE MONTH(DueDate) = @month AND YEAR(DueDate) = @year
      ORDER BY DueDate DESC
    `);
  return result.recordset.map((row) => ({
    ...row,
    statementBalance: parseFloat(row.statementBalance),
    amountPaid: parseFloat(row.amountPaid),
    dueDate: row.dueDate.toISOString().split('T')[0],
    paidDate: row.paidDate ? row.paidDate.toISOString().split('T')[0] : undefined,
  }));
}

export async function createCreditCardStatement(
  statement: Omit<CreditCardStatement, 'id'>
): Promise<CreditCardStatement> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('creditCardId', sql.UniqueIdentifier, statement.creditCardId)
    .input('statementBalance', sql.Decimal(18, 2), statement.statementBalance)
    .input('amountPaid', sql.Decimal(18, 2), statement.amountPaid || 0)
    .input('dueDate', sql.Date, statement.dueDate)
    .input('status', sql.NVarChar(20), statement.status || 'pending')
    .input('paidDate', sql.Date, statement.paidDate || null)
    .input('notes', sql.NVarChar(sql.MAX), statement.notes || null).query(`
      INSERT INTO CreditCardStatements (CreditCardId, StatementBalance, AmountPaid, DueDate, Status, PaidDate, Notes)
      OUTPUT INSERTED.Id as id, INSERTED.CreditCardId as creditCardId, INSERTED.StatementBalance as statementBalance,
             INSERTED.AmountPaid as amountPaid, INSERTED.DueDate as dueDate, INSERTED.Status as status,
             INSERTED.PaidDate as paidDate, INSERTED.Notes as notes
      VALUES (@creditCardId, @statementBalance, @amountPaid, @dueDate, @status, @paidDate, @notes)
    `);
  const row = result.recordset[0];
  return {
    ...row,
    statementBalance: parseFloat(row.statementBalance),
    amountPaid: parseFloat(row.amountPaid),
    dueDate: row.dueDate.toISOString().split('T')[0],
    paidDate: row.paidDate ? row.paidDate.toISOString().split('T')[0] : undefined,
  };
}

export async function updateCreditCardStatement(
  id: string,
  statement: Partial<CreditCardStatement>
): Promise<CreditCardStatement | null> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .input('creditCardId', sql.UniqueIdentifier, statement.creditCardId)
    .input('statementBalance', sql.Decimal(18, 2), statement.statementBalance)
    .input('amountPaid', sql.Decimal(18, 2), statement.amountPaid || 0)
    .input('dueDate', sql.Date, statement.dueDate)
    .input('status', sql.NVarChar(20), statement.status || 'pending')
    .input('paidDate', sql.Date, statement.paidDate || null)
    .input('notes', sql.NVarChar(sql.MAX), statement.notes || null).query(`
      UPDATE CreditCardStatements SET CreditCardId = @creditCardId, StatementBalance = @statementBalance,
             AmountPaid = @amountPaid, DueDate = @dueDate, Status = @status, PaidDate = @paidDate,
             Notes = @notes, UpdatedAt = GETDATE()
      OUTPUT INSERTED.Id as id, INSERTED.CreditCardId as creditCardId, INSERTED.StatementBalance as statementBalance,
             INSERTED.AmountPaid as amountPaid, INSERTED.DueDate as dueDate, INSERTED.Status as status,
             INSERTED.PaidDate as paidDate, INSERTED.Notes as notes
      WHERE Id = @id
    `);
  if (!result.recordset[0]) return null;
  const row = result.recordset[0];
  return {
    ...row,
    statementBalance: parseFloat(row.statementBalance),
    amountPaid: parseFloat(row.amountPaid),
    dueDate: row.dueDate.toISOString().split('T')[0],
    paidDate: row.paidDate ? row.paidDate.toISOString().split('T')[0] : undefined,
  };
}

export async function deleteCreditCardStatement(id: string): Promise<boolean> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query(`DELETE FROM CreditCardStatements WHERE Id = @id`);
  return result.rowsAffected[0] > 0;
}

// ==================== SAVINGS GOALS ====================

export async function getSavingsGoals(): Promise<SavingsGoal[]> {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT Id as id, Name as name, TargetAmount as targetAmount, CurrentAmount as currentAmount,
           Deadline as deadline, Color as color
    FROM SavingsGoals
    ORDER BY Name
  `);
  return result.recordset.map((row) => ({
    ...row,
    targetAmount: parseFloat(row.targetAmount),
    currentAmount: parseFloat(row.currentAmount),
    deadline: row.deadline ? row.deadline.toISOString().split('T')[0] : undefined,
  }));
}

export async function createSavingsGoal(
  goal: Omit<SavingsGoal, 'id'>
): Promise<SavingsGoal> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('name', sql.NVarChar(100), goal.name)
    .input('targetAmount', sql.Decimal(18, 2), goal.targetAmount)
    .input('currentAmount', sql.Decimal(18, 2), goal.currentAmount || 0)
    .input('deadline', sql.Date, goal.deadline || null)
    .input('color', sql.NVarChar(20), goal.color || '#22c55e').query(`
      INSERT INTO SavingsGoals (Name, TargetAmount, CurrentAmount, Deadline, Color)
      OUTPUT INSERTED.Id as id, INSERTED.Name as name, INSERTED.TargetAmount as targetAmount,
             INSERTED.CurrentAmount as currentAmount, INSERTED.Deadline as deadline, INSERTED.Color as color
      VALUES (@name, @targetAmount, @currentAmount, @deadline, @color)
    `);
  const row = result.recordset[0];
  return {
    ...row,
    targetAmount: parseFloat(row.targetAmount),
    currentAmount: parseFloat(row.currentAmount),
    deadline: row.deadline ? row.deadline.toISOString().split('T')[0] : undefined,
  };
}

export async function updateSavingsGoal(
  id: string,
  goal: Partial<SavingsGoal>
): Promise<SavingsGoal | null> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .input('name', sql.NVarChar(100), goal.name)
    .input('targetAmount', sql.Decimal(18, 2), goal.targetAmount)
    .input('currentAmount', sql.Decimal(18, 2), goal.currentAmount || 0)
    .input('deadline', sql.Date, goal.deadline || null)
    .input('color', sql.NVarChar(20), goal.color || '#22c55e').query(`
      UPDATE SavingsGoals SET Name = @name, TargetAmount = @targetAmount, CurrentAmount = @currentAmount,
             Deadline = @deadline, Color = @color, UpdatedAt = GETDATE()
      OUTPUT INSERTED.Id as id, INSERTED.Name as name, INSERTED.TargetAmount as targetAmount,
             INSERTED.CurrentAmount as currentAmount, INSERTED.Deadline as deadline, INSERTED.Color as color
      WHERE Id = @id
    `);
  if (!result.recordset[0]) return null;
  const row = result.recordset[0];
  return {
    ...row,
    targetAmount: parseFloat(row.targetAmount),
    currentAmount: parseFloat(row.currentAmount),
    deadline: row.deadline ? row.deadline.toISOString().split('T')[0] : undefined,
  };
}

export async function deleteSavingsGoal(id: string): Promise<boolean> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query(`DELETE FROM SavingsGoals WHERE Id = @id`);
  return result.rowsAffected[0] > 0;
}

// ==================== SAVINGS CONTRIBUTIONS ====================

export async function getSavingsContributions(): Promise<SavingsContribution[]> {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT Id as id, SavingsGoalId as savingsGoalId, Amount as amount, Date as date, Notes as notes
    FROM SavingsContributions
    ORDER BY Date DESC
  `);
  return result.recordset.map((row) => ({
    ...row,
    amount: parseFloat(row.amount),
    date: row.date.toISOString().split('T')[0],
  }));
}

export async function getSavingsContributionsByMonth(
  month: number,
  year: number
): Promise<SavingsContribution[]> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('month', sql.Int, month)
    .input('year', sql.Int, year).query(`
      SELECT Id as id, SavingsGoalId as savingsGoalId, Amount as amount, Date as date, Notes as notes
      FROM SavingsContributions
      WHERE MONTH(Date) = @month AND YEAR(Date) = @year
      ORDER BY Date DESC
    `);
  return result.recordset.map((row) => ({
    ...row,
    amount: parseFloat(row.amount),
    date: row.date.toISOString().split('T')[0],
  }));
}

export async function createSavingsContribution(
  contribution: Omit<SavingsContribution, 'id'>
): Promise<SavingsContribution> {
  const pool = await getConnection();

  // Start a transaction to update both tables
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const request = new sql.Request(transaction);
    const result = await request
      .input('savingsGoalId', sql.UniqueIdentifier, contribution.savingsGoalId)
      .input('amount', sql.Decimal(18, 2), contribution.amount)
      .input('date', sql.Date, contribution.date)
      .input('notes', sql.NVarChar(sql.MAX), contribution.notes || null).query(`
        INSERT INTO SavingsContributions (SavingsGoalId, Amount, Date, Notes)
        OUTPUT INSERTED.Id as id, INSERTED.SavingsGoalId as savingsGoalId, INSERTED.Amount as amount,
               INSERTED.Date as date, INSERTED.Notes as notes
        VALUES (@savingsGoalId, @amount, @date, @notes)
      `);

    // Update the savings goal's current amount
    const updateRequest = new sql.Request(transaction);
    await updateRequest
      .input('savingsGoalId', sql.UniqueIdentifier, contribution.savingsGoalId)
      .input('amount', sql.Decimal(18, 2), contribution.amount).query(`
        UPDATE SavingsGoals SET CurrentAmount = CurrentAmount + @amount, UpdatedAt = GETDATE()
        WHERE Id = @savingsGoalId
      `);

    await transaction.commit();

    const row = result.recordset[0];
    return {
      ...row,
      amount: parseFloat(row.amount),
      date: row.date.toISOString().split('T')[0],
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function deleteSavingsContribution(id: string): Promise<boolean> {
  const pool = await getConnection();

  // Get the contribution first to know the amount to subtract
  const getResult = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query(
      `SELECT SavingsGoalId, Amount FROM SavingsContributions WHERE Id = @id`
    );

  if (getResult.recordset.length === 0) return false;

  const { SavingsGoalId, Amount } = getResult.recordset[0];

  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const deleteRequest = new sql.Request(transaction);
    await deleteRequest
      .input('id', sql.UniqueIdentifier, id)
      .query(`DELETE FROM SavingsContributions WHERE Id = @id`);

    const updateRequest = new sql.Request(transaction);
    await updateRequest
      .input('savingsGoalId', sql.UniqueIdentifier, SavingsGoalId)
      .input('amount', sql.Decimal(18, 2), Amount).query(`
        UPDATE SavingsGoals SET CurrentAmount = CurrentAmount - @amount, UpdatedAt = GETDATE()
        WHERE Id = @savingsGoalId
      `);

    await transaction.commit();
    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// ==================== MONTHLY BUDGETS ====================

export async function getMonthlyBudget(
  month: number,
  year: number
): Promise<MonthlyBudget | null> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('month', sql.Int, month)
    .input('year', sql.Int, year).query(`
      SELECT Id as id, Month as month, Year as year, TotalIncome as totalIncome,
             EssentialsPercentage as essentialsPercentage, NonEssentialsPercentage as nonEssentialsPercentage,
             SavingsPercentage as savingsPercentage
      FROM MonthlyBudgets
      WHERE Month = @month AND Year = @year
    `);
  if (!result.recordset[0]) return null;
  const row = result.recordset[0];
  return {
    ...row,
    totalIncome: parseFloat(row.totalIncome),
    essentialsPercentage: parseFloat(row.essentialsPercentage),
    nonEssentialsPercentage: parseFloat(row.nonEssentialsPercentage),
    savingsPercentage: parseFloat(row.savingsPercentage),
  };
}

export async function upsertMonthlyBudget(
  budget: Omit<MonthlyBudget, 'id'>
): Promise<MonthlyBudget> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('month', sql.Int, budget.month)
    .input('year', sql.Int, budget.year)
    .input('totalIncome', sql.Decimal(18, 2), budget.totalIncome)
    .input('essentialsPercentage', sql.Decimal(5, 2), budget.essentialsPercentage)
    .input(
      'nonEssentialsPercentage',
      sql.Decimal(5, 2),
      budget.nonEssentialsPercentage
    )
    .input('savingsPercentage', sql.Decimal(5, 2), budget.savingsPercentage).query(`
      MERGE MonthlyBudgets AS target
      USING (SELECT @month AS Month, @year AS Year) AS source
      ON target.Month = source.Month AND target.Year = source.Year
      WHEN MATCHED THEN
        UPDATE SET TotalIncome = @totalIncome, EssentialsPercentage = @essentialsPercentage,
                   NonEssentialsPercentage = @nonEssentialsPercentage, SavingsPercentage = @savingsPercentage,
                   UpdatedAt = GETDATE()
      WHEN NOT MATCHED THEN
        INSERT (Month, Year, TotalIncome, EssentialsPercentage, NonEssentialsPercentage, SavingsPercentage)
        VALUES (@month, @year, @totalIncome, @essentialsPercentage, @nonEssentialsPercentage, @savingsPercentage)
      OUTPUT INSERTED.Id as id, INSERTED.Month as month, INSERTED.Year as year, INSERTED.TotalIncome as totalIncome,
             INSERTED.EssentialsPercentage as essentialsPercentage, INSERTED.NonEssentialsPercentage as nonEssentialsPercentage,
             INSERTED.SavingsPercentage as savingsPercentage;
    `);
  const row = result.recordset[0];
  return {
    ...row,
    totalIncome: parseFloat(row.totalIncome),
    essentialsPercentage: parseFloat(row.essentialsPercentage),
    nonEssentialsPercentage: parseFloat(row.nonEssentialsPercentage),
    savingsPercentage: parseFloat(row.savingsPercentage),
  };
}

// ==================== APP SETTINGS ====================

export async function getAppSettings(): Promise<AppSettings> {
  const pool = await getConnection();
  const result = await pool.request().query(`
    SELECT Currency as currency, CurrencySymbol as currencySymbol,
           DefaultEssentialsPercentage as defaultEssentialsPercentage,
           DefaultNonEssentialsPercentage as defaultNonEssentialsPercentage,
           DefaultSavingsPercentage as defaultSavingsPercentage, Theme as theme
    FROM AppSettings WHERE Id = 1
  `);
  const row = result.recordset[0];
  return {
    ...row,
    defaultEssentialsPercentage: parseFloat(row.defaultEssentialsPercentage),
    defaultNonEssentialsPercentage: parseFloat(row.defaultNonEssentialsPercentage),
    defaultSavingsPercentage: parseFloat(row.defaultSavingsPercentage),
  };
}

export async function updateAppSettings(
  settings: Partial<AppSettings>
): Promise<AppSettings> {
  const pool = await getConnection();
  const result = await pool
    .request()
    .input('currency', sql.NVarChar(10), settings.currency)
    .input('currencySymbol', sql.NVarChar(10), settings.currencySymbol)
    .input(
      'defaultEssentialsPercentage',
      sql.Decimal(5, 2),
      settings.defaultEssentialsPercentage
    )
    .input(
      'defaultNonEssentialsPercentage',
      sql.Decimal(5, 2),
      settings.defaultNonEssentialsPercentage
    )
    .input(
      'defaultSavingsPercentage',
      sql.Decimal(5, 2),
      settings.defaultSavingsPercentage
    )
    .input('theme', sql.NVarChar(20), settings.theme || 'light').query(`
      UPDATE AppSettings SET Currency = ISNULL(@currency, Currency), CurrencySymbol = ISNULL(@currencySymbol, CurrencySymbol),
             DefaultEssentialsPercentage = ISNULL(@defaultEssentialsPercentage, DefaultEssentialsPercentage),
             DefaultNonEssentialsPercentage = ISNULL(@defaultNonEssentialsPercentage, DefaultNonEssentialsPercentage),
             DefaultSavingsPercentage = ISNULL(@defaultSavingsPercentage, DefaultSavingsPercentage),
             Theme = ISNULL(@theme, Theme), UpdatedAt = GETDATE()
      OUTPUT INSERTED.Currency as currency, INSERTED.CurrencySymbol as currencySymbol,
             INSERTED.DefaultEssentialsPercentage as defaultEssentialsPercentage,
             INSERTED.DefaultNonEssentialsPercentage as defaultNonEssentialsPercentage,
             INSERTED.DefaultSavingsPercentage as defaultSavingsPercentage, INSERTED.Theme as theme
      WHERE Id = 1
    `);
  const row = result.recordset[0];
  return {
    ...row,
    defaultEssentialsPercentage: parseFloat(row.defaultEssentialsPercentage),
    defaultNonEssentialsPercentage: parseFloat(row.defaultNonEssentialsPercentage),
    defaultSavingsPercentage: parseFloat(row.defaultSavingsPercentage),
  };
}

