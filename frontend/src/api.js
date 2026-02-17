//this connects to the backend 
import axios from 'axios';

const API=axios.create({baseURL:'http://localhost:3000/api'});
API.interceptors.request.use((req)=>{
    const token=localStorage.getItem('token');
    if(token){
        req.headers.Authorization = `Bearer ${token}`;

    }
    return req;
});

export const login=(formData)=>API.post('/auth/login',formData);
export const register=(formData)=>API.post('/auth/register',formData);
export default API;