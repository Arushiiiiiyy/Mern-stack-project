import mongoose from 'mongoose';

const eventSchema=new mongoose.Schema({
    organizer:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    name:{type:String,required:true},
    description:{type:String,required:true
    },
    type:{type:String,enum:['Normal','Merchandise'],required:true},
    eligibility:{type:String,enum:['All','IIIT','Non-IIIT'],default:'All'},
    startDate:{type:Date,required:true},
    endDate:{type:Date,required:true},
    registrationDeadline:{type:Date,required:true},
    venue:{type:String,required:true},
    limit:{type:Number,required:true},
    registeredCount:{type:Number,default:0},
    price:{type:Number,default:0},
    formFields:[
        {
            label:String,
            fieldType:{type:String,enum:['text','number','dropdown','file']},
            required:{type:Boolean,default:false},
            option:[String]
        }
    ],
    merchandiseImage:{type:String},
    variants:[
        {
            name:String,
            options:[String],
            stock:{type:Number,default:0}
        }
    ],
    purchaseLimitPerUser:{type:Number,default:1},
    isTeamEvent:{type:Boolean,default:false},
    minTeamSize:{type:Number,default:2},
    maxTeamSize:{type:Number,default:4},
    tags:[String],
    status:{
        type:String,
        enum:['Draft','Published','Ongoing','Completed','Closed'],
        default:'Draft'
    },
    discordWebhook:{type:String}

}, {timestamps:true});

const Event=mongoose.model('Event',eventSchema);
export default Event;

