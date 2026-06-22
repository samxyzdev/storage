import 'dotenv/config'
import { drizzle } from "drizzle-orm/node-postgres";




// const getEnvVariable = (name: string) => {
//   const value = process.env[name] || "postgres://postgres:mypassword@localhost:5432/postgres";
//   if (value == null) throw new Error(`environment variable ${name} not found`);
//   return value;
// };

// export const db = drizzle(process.env.DATABASE_URL!);
export const db = drizzle("postgres://postgres:mypassword@localhost:5432/postgres");

// console.log("DATABASE_URL",process.env.DATABASE_URL);


export * from "./db/schema";
export * from "drizzle-orm";



// import dotenv from "dotenv"
// const result = dotenv.config()

// if (result.error) {
//   throw result.error
// }
// console.log(result.parsed)
        // iss code se env laod ho rahi hai ya nahi wo debug kar skte hai.
        // mere case main wo src folder ke andar read kar rha tha bahar nahi.
        // Lekin fir migrate karne main dikkat aayi ab jab mene bahar rakha to read kar rha hai.
        // pta nahi kyun
        