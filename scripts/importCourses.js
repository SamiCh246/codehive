#!/usr/bin/env node

/**
 * Import DePauw Course Data to Firebase
 * 
 * This script imports the generated course data into Firebase Firestore.
 * Run this after generating the course data with extractCourseData.js
 * 
 * Usage: node scripts/importCourses.js
 */

import dotenv from 'dotenv'
import { initializeApp } from 'firebase/app'
import { addDoc, collection, getDocs, getFirestore } from 'firebase/firestore'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') })

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

// Check for missing configuration
const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => typeof value === 'undefined')
  .map(([key]) => key)

if (missingKeys.length > 0) {
  console.error('❌ Missing Firebase configuration:')
  missingKeys.forEach(key => console.error(`  - ${key}`))
  console.error('\nPlease check your .env file and ensure all Firebase configuration variables are set.')
  process.exit(1)
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Import course data
async function importCourses() {
  try {
    console.log('🚀 Starting course data import to Firebase...')
    
    // Read course data from JSON file
    const courseDataPath = path.join(__dirname, '..', 'src', 'data', 'depauw-courses.json')
    
    if (!fs.existsSync(courseDataPath)) {
      console.error('❌ Course data file not found. Please run extractCourseData.js first.')
      process.exit(1)
    }
    
    const courseData = JSON.parse(fs.readFileSync(courseDataPath, 'utf8'))
    console.log(`📚 Found ${courseData.length} courses to import`)
    
    // Check if courses already exist
    const existingCourses = await getDocs(collection(db, 'courseCatalog'))
    if (existingCourses.size > 0) {
      console.log(`⚠️  Found ${existingCourses.size} existing courses in Firebase.`)
      console.log('This will add new courses alongside existing ones.')
      
      // Optionally clear existing courses (uncomment if needed)
      // console.log('🗑️  Clearing existing courses...')
      // const deletePromises = existingCourses.docs.map(doc => deleteDoc(doc.ref))
      // await Promise.all(deletePromises)
      // console.log('✅ Cleared existing courses')
    }
    
    // Import courses
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    }
    
    for (const course of courseData) {
      try {
        // Add timestamp fields
        const courseWithTimestamp = {
          ...course,
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        }
        
        await addDoc(collection(db, 'courseCatalog'), courseWithTimestamp)
        results.successful++
        console.log(`✅ Imported: ${course.courseCode} - ${course.title}`)
        
      } catch (error) {
        results.failed++
        results.errors.push({ course: course.courseCode, error: error.message })
        console.error(`❌ Failed to import ${course.courseCode}:`, error.message)
      }
    }
    
    console.log('\n📊 Import Summary:')
    console.log(`  ✅ Successful: ${results.successful}`)
    console.log(`  ❌ Failed: ${results.failed}`)
    console.log(`  📈 Total: ${courseData.length}`)
    
    if (results.errors.length > 0) {
      console.log('\n🚨 Errors encountered:')
      results.errors.forEach(({ course, error }) => {
        console.log(`  - ${course}: ${error}`)
      })
    }
    
    if (results.successful > 0) {
      console.log('\n🎉 Course import completed successfully!')
      console.log('You can now access the Course Catalog in your CodeHive application.')
    }
    
  } catch (error) {
    console.error('💥 Import failed:', error)
    throw error
  }
}

// Run import if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  importCourses()
    .then(() => {
      console.log('\n✨ Import process completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Import process failed:', error)
      process.exit(1)
    })
}

export { importCourses }
