import * as anchor from '@project-serum/anchor'
import { useEffect, useMemo, useState } from 'react'
import { TODO_PROGRAM_PUBKEY } from '../constants'
import todoIDL from '../constants/todo.json'
import toast from 'react-hot-toast'
import { SystemProgram } from '@solana/web3.js'
import { utf8 } from '@project-serum/anchor/dist/cjs/utils/bytes'
import { findProgramAddressSync } from '@project-serum/anchor/dist/cjs/utils/pubkey'
import { useAnchorWallet, useConnection, useWallet } from '@solana/wallet-adapter-react'
import { authorFilter } from '../utils'

// Static data that reflects the todo struct of the solana program
let dummyTodos = [
    {
        account:{
            idx: '0',
            content: 'Finish the essay collaboration',
            marked: false,
        }

    },
    {
        account:{
            idx: '1',
            content: 'Understand Static Todo App',
            marked: false,          
        }

    },
    {
        account:{
            idx: '2',
            content: 'Read next chapter of the book in Danish',
            marked: false,   
        }
    },
    {
        account:{
            idx: '3',
            content: 'Do the math for next monday',
            marked: false,   
        }
    },
    {
        account:{
            idx: '4',
            content: 'Send the finished assignment',
            marked: true,  
        }
    },
    {
        account:{
            idx: '5',
            content: 'Read english book chapter 5',
            marked: true,          
        }
    },
]


export function useTodo() {
    const { connection } = useConnection()
    const { publicKey } = useWallet()
    const anchorWallet = useAnchorWallet()

    const [initialized, setInitialized] = useState(false)
    const [lastTodo, setLastTodo] = useState(0)
    const [todos, setTodos] = useState([])
    const [loading, setLoading] = useState(false)
    const [transactionPending, setTransactionPending] = useState(false)
    const [input, setInput] = useState("")


    const program = useMemo(() => {
        if (anchorWallet) {
            const provider = new anchor.AnchorProvider(connection, anchorWallet, anchor.AnchorProvider.defaultOptions())
            return new anchor.Program(todoIDL, TODO_PROGRAM_PUBKEY, provider)
        }
    }, [connection, anchorWallet])

    useEffect(() => {
        //Fetch the userProfile according to our address, if there is a profile we want to get its todos

       const fetchProfileAccounts =async () =>{
        //Functions A and B are both Async
        if (program && publicKey && !transactionPending){
            try{
                setLoading(true);
                const [profilePda, profileBump] =await findProgramAddressSync([utf8.encode('USER_STATE'),publicKey.toBuffer()],program.programId);
                const profileAccount = await program.account.userProfile.fetch(profilePda);
                if(profileAccount){
                    //fetch the todos asociated to the profileAccount
                    setLastTodo(profileAccount.lastTodo);
                    setInitialized(true);
                    const todoAccounts = await program.account.todoAccount.all(authoFilter(publicKey.toString()));
                    setTodos(todoAccount);
                    //setTodos Accounts 
                } else{
                    console.log('Hey there is not account');
                    setInitialized(false);
                    //the account has not been initialized
                }
            } catch (e){
                console.log(e);
                setInitialized(false);
                setTodos([]);
            } finally{
                setLoading(false);
            }
        }
       }

       fetchProfileAccounts();

    }, [publicKey,program, transactionPending]);

    const handleChange = (e)=> {
        setInput(e.target.value)
    }
  
    const initializeUser = async () =>{
        if (program && publicKey){
            try{
                setTransactionPending(true);
                const [profilePda, profileBump] =await findProgramAddressSync([utf8.encode('USER_STATE'),publicKey.toBuffer()],program.programId);
                const tx =await program.methods.initializeUser().accounts({
                    userProfilePda,
                    authority: publicKey,
                    systemProgram: SystemPreogram.programId
                }).rpc();
                setInitialized(true);
                toast.success("Successfully initialized user");
            }catch (e){
                console.log (e);
                toast.error(e.toString());
            }finally{
                setTransactionPending(false);
            }
        }
    }


    const initializeStaticUser = () => {
        setInitialized(true)
    }
    const addTodo = async (e)=>{
        //logic for sending a transactionto add todo itemor todo account on our solana program
        e.preventDefault();
        if(program && publicKey){
            try {
                setTransactionPending (true);
                //user_profile
                const [profilePda, profileBump] =await findProgramAddressSync([utf8.encode('USER_STATE'),publicKey.toBuffer()],program.programId);
                //todo_account
                const [todoPda,todoBump] = await findProgramAddressSync ([utf8.encode('TODO_STATE'), publicKey.toBuffer(), Uint8Array.from ([lastTodo])], programId);
                const content = input;
                if(content){
                    //process transaction
                    await program.methods.addTodo(content).accounts({
                        userProfile: profilePda,
                        todoAccount: todoPda,
                        authority: publicKey,
                        systemProgram: SystemProgram.programId
                    }).rpc()
                    toast.success("Successfully added todo");
                    setInput("");
                }else{
                    //No transaction
                    setTransactionPending(false);
                    return;
                }
            }catch (e){
                console.log(e);
                toast.error(e.toString())
            }finally{
                setTransactionPending(false);
            }
        }
    }


    const addStaticTodo = (e) => {
        e.preventDefault()
        if(input) {
            const newTodo = {
                account:{
                    idx: parseInt(todos[todos.length-1].account.idx) + 1,
                    content: input,
                    marked: false
                }
            }
            setTodos([newTodo,...todos])
            setInput("")
        }
    }

    const markStaticTodo = (todoID) => {
        setTodos(
          todos.map(todo => {
            console.log(todo.account, todoID, "YTAAAAA")
            if (todo.account.idx === todoID) {
                console.log("MATCHED")
                return {
                  account: {
                    idx: todo.account.idx,
                    content: todo.account.content,
                    marked: !todo.account.marked
                  }
                }
            }
    
            return todo
          }),
        )
    }

    const removeStaticTodo = async (todoID) => {
        setTodos(
            todos.filter(todo => {
              if (todo.account.idx === todoID) {
                return 
              }
      
              return todo
            }),
          )
    }


    const incompleteTodos = useMemo(() => todos.filter((todo) => !todo.account.marked), [todos])
    const completedTodos = useMemo(() => todos.filter((todo) => todo.account.marked), [todos])

    return { initialized, initializeStaticUser, initializeUser, loading, transactionPending, completedTodos, incompleteTodos, markStaticTodo, removeStaticTodo, addStaticTodo, input, setInput, handleChange, addTodo }
}
