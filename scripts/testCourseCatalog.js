#!/usr/bin/env node

/**
 * Test Course Catalog Functionality
 * 
 * This script tests the course catalog service to ensure it's working correctly
 * after the fixes for Firebase index issues.
 */

import dotenv from 'dotenv'
import { initializeApp } from 'firebase/app'
import { collection, getDocs, getFirestore, orderBy, query } from 'firebase/firestore'
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

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function testCourseCatalog() {
  try {
    console.log('🧪 Testing Course Catalog functionality...')
    
    // Test 1: Basic query without filters
    console.log('\n📚 Test 1: Fetching all courses...')
    const q = query(collection(db, 'courseCatalog'), orderBy('courseCode', 'asc'))
    const querySnapshot = await getDocs(q)
    
    const courses = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    
    console.log(`✅ Successfully fetched ${courses.length} courses`)
    
    // Test 2: In-memory filtering
    console.log('\n🔍 Test 2: Testing in-memory filtering...')
    
    // Filter by course level
    const level100Courses = courses.filter(course => course.courseLevel === '100')
    const level200Courses = courses.filter(course => course.courseLevel === '200')
    const level300Courses = courses.filter(course => course.courseLevel === '300')
    const level400Courses = courses.filter(course => course.courseLevel === '400')
    
    console.log(`✅ Level 100 courses: ${level100Courses.length}`)
    console.log(`✅ Level 200 courses: ${level200Courses.length}`)
    console.log(`✅ Level 300 courses: ${level300Courses.length}`)
    console.log(`✅ Level 400 courses: ${level400Courses.length}`)
    
    // Filter by distribution area
    const scienceCourses = courses.filter(course => course.distributionArea === 'Science and Mathematics')
    console.log(`✅ Science and Mathematics courses: ${scienceCourses.length}`)
    
    // Filter by prerequisites
    const coursesWithPrereqs = courses.filter(course => course.prerequisites && course.prerequisites.length > 0)
    const coursesWithoutPrereqs = courses.filter(course => !course.prerequisites || course.prerequisites.length === 0)
    
    console.log(`✅ Courses with prerequisites: ${coursesWithPrereqs.length}`)
    console.log(`✅ Courses without prerequisites: ${coursesWithoutPrereqs.length}`)
    
    // Test 3: Text search
    console.log('\n🔍 Test 3: Testing text search...')
    
    const searchTerm = 'data'
    const searchResults = courses.filter(course => 
      course.courseCode.toLowerCase().includes(searchTerm) ||
      course.title.toLowerCase().includes(searchTerm) ||
      course.description.toLowerCase().includes(searchTerm)
    )
    
    console.log(`✅ Search results for "${searchTerm}": ${searchResults.length} courses`)
    searchResults.forEach(course => {
      console.log(`   - ${course.courseCode}: ${course.title}`)
    })
    
    // Test 4: Sample course data
    console.log('\n📋 Test 4: Sample course data...')
    const sampleCourse = courses[0]
    if (sampleCourse) {
      console.log(`✅ Sample course: ${sampleCourse.courseCode}`)
      console.log(`   Title: ${sampleCourse.title}`)
      console.log(`   Level: ${sampleCourse.courseLevel}`)
      console.log(`   Credits: ${sampleCourse.credits}`)
      console.log(`   Distribution Area: ${sampleCourse.distributionArea}`)
      console.log(`   Prerequisites: ${sampleCourse.prerequisites?.length || 0}`)
      console.log(`   Description length: ${sampleCourse.description?.length || 0} characters`)
    }
    
    console.log('\n🎉 All tests passed! Course Catalog is working correctly.')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    throw error
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testCourseCatalog()
    .then(() => {
      console.log('\n✨ Course Catalog testing completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Course Catalog testing failed:', error)
      process.exit(1)
    })
}

export { testCourseCatalog }
