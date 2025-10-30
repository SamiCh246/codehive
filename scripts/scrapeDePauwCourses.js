#!/usr/bin/env node

/**
 * DePauw Computer Science Course Scraper
 * 
 * This script scrapes course data from the DePauw University Computer Science
 * courses page and outputs structured JSON data for import into Firebase.
 * 
 * Usage: node scripts/scrapeDePauwCourses.js
 */

import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COURSES_URL = 'https://www.depauw.edu/academics/majors-and-minors/about-computer-science/courses/';

// Helper function to make HTTPS request
function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        resolve(data);
      });
      
    }).on('error', (error) => {
      reject(error);
    });
  });
}

// Helper function to extract course level from course code
function extractCourseLevel(courseCode) {
  if (!courseCode) return null;
  const match = courseCode.match(/(\d+)/);
  if (match) {
    const level = parseInt(match[1]);
    if (level >= 100 && level < 200) return '100';
    if (level >= 200 && level < 300) return '200';
    if (level >= 300 && level < 400) return '300';
    if (level >= 400 && level < 500) return '400';
  }
  return null;
}

// Helper function to parse prerequisites from text
function parsePrerequisites(prereqText) {
  if (!prereqText || prereqText.toLowerCase().includes('none')) {
    return [];
  }
  
  // Split by common separators and clean up
  const prereqs = prereqText
    .split(/[,;]/)
    .map(p => p.trim())
    .filter(p => p && !p.toLowerCase().includes('permission') && !p.toLowerCase().includes('instructor'))
    .map(p => p.replace(/\.$/, '')); // Remove trailing periods
  
  return prereqs;
}

// Main scraping function
async function scrapeCourses() {
  try {
    console.log('Fetching DePauw Computer Science courses page...');
    const html = await fetchPage(COURSES_URL);
    
    console.log('Parsing course data...');
    const courses = parseCoursesFromHTML(html);
    
    console.log(`Found ${courses.length} courses`);
    
    // Output to JSON file
    const outputPath = path.join(__dirname, '..', 'src', 'data', 'depauw-courses.json');
    const outputDir = path.dirname(outputPath);
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(courses, null, 2));
    console.log(`Course data saved to: ${outputPath}`);
    
    // Also output a summary
    console.log('\n=== COURSE SUMMARY ===');
    courses.forEach(course => {
      console.log(`${course.courseCode}: ${course.title} (${course.courseLevel} level)`);
    });
    
    return courses;
    
  } catch (error) {
    console.error('Error scraping courses:', error);
    throw error;
  }
}

// Parse courses from HTML content
function parseCoursesFromHTML(html) {
  const courses = [];
  
  // Use regex to find course sections
  // Each course is wrapped in a section with class containing course info
  const courseRegex = /<h2[^>]*>([^<]+)<\/h2>\s*<h3[^>]*>([^<]+)<\/h3>([\s\S]*?)(?=<h2|$)/g;
  
  let match;
  while ((match = courseRegex.exec(html)) !== null) {
    const [, courseCode, title, content] = match;
    
    // Skip non-course sections
    if (!courseCode.includes('CSC') || courseCode.includes('Contact Us') || courseCode.includes('Request Information')) {
      continue;
    }
    
    const course = extractCourseData(courseCode, title, content);
    if (course) {
      courses.push(course);
    }
  }
  
  return courses;
}

// Extract individual course data from HTML content
function extractCourseData(courseCode, title, content) {
  try {
    // Clean course code
    const cleanCourseCode = courseCode.replace(/^CSC\s*/, 'CSC ').trim();
    
    // Extract description
    const descriptionMatch = content.match(/<h4[^>]*>Course Description<\/h4>\s*<p[^>]*>([\s\S]*?)<\/p>/);
    const description = descriptionMatch ? 
      descriptionMatch[1]
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim() : '';
    
    // Extract prerequisites
    const prereqMatch = content.match(/<h4[^>]*>Prerequisites<\/h4>\s*<p[^>]*>([\s\S]*?)<\/p>/);
    const prereqText = prereqMatch ? 
      prereqMatch[1]
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim() : '';
    
    const prerequisites = parsePrerequisites(prereqText);
    
    // Extract credits
    const creditsMatch = content.match(/<h4[^>]*>Credits<\/h4>\s*<p[^>]*>([\s\S]*?)<\/p>/);
    const credits = creditsMatch ? 
      creditsMatch[1]
        .replace(/<[^>]*>/g, '')
        .trim() : '';
    
    // Extract distribution area
    const distributionMatch = content.match(/<h4[^>]*>Distribution Area<\/h4>\s*<p[^>]*>([\s\S]*?)<\/p>/);
    const distributionArea = distributionMatch ? 
      distributionMatch[1]
        .replace(/<[^>]*>/g, '')
        .trim() : '';
    
    return {
      courseCode: cleanCourseCode,
      title: title.trim(),
      description,
      prerequisites,
      credits,
      distributionArea,
      courseLevel: extractCourseLevel(cleanCourseCode)
    };
    
  } catch (error) {
    console.error(`Error parsing course ${courseCode}:`, error);
    return null;
  }
}

// Run the scraper if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  scrapeCourses()
    .then(() => {
      console.log('\n✅ Course scraping completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Course scraping failed:', error);
      process.exit(1);
    });
}

export { extractCourseData, parseCoursesFromHTML, scrapeCourses };

