import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const GST_API_URL = 'https://powerful-gstin-tool.p.rapidapi.com/v1/gstin';

export const lookupGstin = async (gstin) => {
    try {
        const response = await axios.get(`${GST_API_URL}/${gstin}/basic`, {
            headers: {
                'x-rapidapi-host': process.env.RAPIDAPI_HOST,
                'x-rapidapi-key': process.env.RAPIDAPI_KEY
            }
        });

        console.log('GST API Response Status:', response.status);
        console.log('GST API Response Data:', JSON.stringify(response.data, null, 2));

        // The API returns { data: { gstin, ... } } on success
        // or sometimes { success: true, data: { ... } }
        const hasData = response.data && (response.data.data?.gstin || response.data.gstin || response.data.success === true);

        if (hasData) {
            return {
                success: true,
                data: response.data.data || response.data
            };
        }

        return {
            success: false,
            message: response.data.message || 'Failed to fetch business info'
        };
    } catch (error) {
        console.error('GST Lookup Error:', error.response?.data || error.message);
        return {
            success: false,
            message: error.response?.data?.message || 'Error connecting to GST service'
        };
    }
};
