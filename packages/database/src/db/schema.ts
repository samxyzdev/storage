import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// -------------------------------------------------------------
// USERS TABLE
// -------------------------------------------------------------
export const roleEnum = pgEnum("user_role", ["admin", "user"]);

export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: varchar("password", { length: 255 }).notNull(),
    role: roleEnum("role").default("user"),
    isDeleted: boolean("isDeleted").default(false).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Naya v1.0 Array Syntax
    index("users_email_idx").on(table.email),
  ],
);

// -------------------------------------------------------------
// FOLDERS TABLE
// -------------------------------------------------------------
export const foldersTable = pgTable(
  "folders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    uniqueFolderName: uuid("uniqueFolderName").notNull().unique(),
    folderName: varchar("folderName", { length: 255 }).notNull(),
    // Self-referencing Foreign Key
    parentId: uuid("parentId").references((): AnyPgColumn => foldersTable.id, {
      onDelete: "cascade",
    }),
    userId: uuid("userId")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("folders_uniqueFolderName_idx").on(table.uniqueFolderName),
    index("folders_parentId_idx").on(table.parentId),
    index("folders_userId_idx").on(table.userId),
  ],
);

// -------------------------------------------------------------
// FILES TABLE
// -------------------------------------------------------------
export const filesTable = pgTable(
  "files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    uniqueFileName: uuid("uniqueFileName").notNull().unique(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    // fileSize as bigint. mode: 'number' Javascript me safe limit tak kaam karta hai
    fileSize: bigint("fileSize", { mode: "number" }).notNull(),
    mimeType: varchar("mimeType", { length: 255 }).notNull(),
    folderId: uuid("folderId")
      .references(() => foldersTable.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("userId")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("files_uniqueFileName_idx").on(table.uniqueFileName),
    index("files_folderId_idx").on(table.folderId),
    index("files_userId_idx").on(table.userId),
  ],
);

// -------------------------------------------------------------
// SESSION TABLE
// -------------------------------------------------------------
export const sessionTable = pgTable(
  "session",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    token: uuid("token").notNull(),
    userId: uuid("userId")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    // expiresAt me defaultNow nahi rakha taaki app logic future time set kar sake
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

// -------------------------------------------------------------
// OTP TABLE
// -------------------------------------------------------------
export const otpTable = pgTable(
  "otp",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    hashOtp: varchar("hashOtp", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .defaultNow()
      .notNull(),
    // expiresAt manually set karna hoga (e.g. +15 mins in JS)
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  },
  (table) => [index("otp_email_idx").on(table.email)],
);
