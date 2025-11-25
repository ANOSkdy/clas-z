import { google } from 'googleapis';
import { Readable } from 'stream';

// 環境変数から認証情報を取得
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

// 改行コードの扱い（.envの\nを実際の改行に置換）
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: privateKey,
    project_id: process.env.GOOGLE_PROJECT_ID,
  },
  scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

/**
 * ファイルをGoogle Driveにアップロードする
 */
export async function uploadToDrive(file: File, fileName: string, mimeType: string) {
  if (!FOLDER_ID) {
    console.warn('GOOGLE_DRIVE_FOLDER_ID is missing. Mocking upload.');
    return { id: 'mock-id-' + Date.now(), webViewLink: '#' };
  }

  try {
    // File オブジェクトから Buffer -> Stream 変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = Readable.from(buffer);

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [FOLDER_ID],
      },
      media: {
        mimeType: mimeType,
        body: stream,
      },
      fields: 'id, webViewLink, name',
    });

    return response.data;
  } catch (error) {
    console.error('Drive Upload Error:', error);
    throw error;
  }
}

/**
 * Google Driveからファイルをストリームとして取得する（メール添付用）
 */
export async function getFileStream(fileId: string) {
  if (!FOLDER_ID) return null; // Mock
  
  try {
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );
    return response.data;
  } catch (error) {
    console.error('Drive Download Error:', error);
    throw error;
  }
}
