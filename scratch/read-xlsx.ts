
import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = './Ke_Hoach_Content_30_Ngay_With_Image_Prompts.xlsx';

try {
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (data.length > 0) {
    console.log('Headers:', data[0]);
    console.log('First 2 rows of data:', data.slice(1, 3));
  } else {
    console.log('Empty sheet');
  }
} catch (err) {
  console.error('Error reading excel:', err);
}
