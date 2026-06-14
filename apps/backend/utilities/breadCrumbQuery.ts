import { db, foldersTable, sql } from "@repo/database";

export async function getFolderBreadcrumbs(folderId: string) {
  // Drizzle ka 'sql' tag use karke hum apni Recursive CTE likhenge
  const query = sql`
  WITH RECURSIVE folder_tree AS (
    -- 1. ANCHOR: Shuruat (Current folder)
    SELECT id, "folderName", "parentId"
    FROM ${foldersTable}
    WHERE id = ${folderId}

    UNION ALL

    -- 2. RECURSIVE RULE: Parent dhoondhne ka rule
    SELECT f.id, f."folderName", f."parentId"
    FROM ${foldersTable} f
    INNER JOIN folder_tree ft ON f.id = ft."parentId"
  )
  -- 3. RESULT: Poori breadcrumb list return karo
  SELECT * FROM folder_tree;
`;
  // Database par query run karna
  const result = await db.execute(query);

  // Ye result tumhe ek array dega jisme current folder se leke
  // root folder tak sab honge!
  return result;
}
