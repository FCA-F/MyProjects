import {defineStore} from "pinia";
export const useStore=defineStore('store',{
    state:()=>({
        userName:''
        
    }),
    actions:{
        setUserName(name:string){
            this.userName=name
        },
        clearUserName(){
            this.userName=''
        }
    }
})
