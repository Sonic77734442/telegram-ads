import {useEffect,useState} from 'react';
export function useStatisticsRefresh(){
 const [tick,setTick]=useState(0);
 useEffect(()=>{const refresh=()=>{if(document.visibilityState==='visible')setTick(t=>t+1)};const id=window.setInterval(refresh,60000);window.addEventListener('focus',refresh);return()=>{window.clearInterval(id);window.removeEventListener('focus',refresh)}},[]);
 return tick;
}
