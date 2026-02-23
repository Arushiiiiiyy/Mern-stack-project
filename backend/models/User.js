import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
const userSchema=new mongoose.Schema({
    firstName:{
        type:String,
        required:true
    },
    lastName:{
        type:String,
        default:''
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    },
    contactNumber:{
        type:String
        //required:true
    },
    role: {
        type: String,
        enum: ['participant','organizer','admin'],
        default:'participant',
        required:true
    },
    //participant specific fields
    participantType:{
        type:String,
        enum:['IIIT', 'Non-IIIT']
    },
    college:{type:String},
    interests:[{type:String}],
    followedOrganizers:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}],
    //organizer specific fields
    category:{type:String, enum:['Cultural','Technical','Sports & Fitness','Gaming & E-Sports','Literary & Debating','Entrepreneurship','Social Service','General'], default:'General'},
    description:{type:String},
    //password reset fields
    resetPasswordRequested:{type:Boolean,default:false},
    resetPasswordReason:{type:String},
    resetPasswordStatus:{type:String,enum:['Pending','Approved','Rejected']},
    resetPasswordComment:{type:String},
    resetPasswordHistory:[{
        requestedAt:{type:Date},
        reason:{type:String},
        status:{type:String},
        resolvedAt:{type:Date},
        comment:{type:String}
    }],
    //organizer extra fields
    contactEmail:{type:String},
    discordWebhook:{type:String},
    disabled:{type:Boolean,default:false},
    archived:{type:Boolean,default:false}
},{timestamps:true});

// Virtual for full name
userSchema.virtual('name').get(function() {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim() || 'Unknown';
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// Password minimum length validation (skipped for already-hashed values)
userSchema.pre('validate', function() {
    if (!this.isModified('password')) return;
    if (this.password.startsWith('$2')) return;
    if (this.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
    }
});

//pre is used to perform a function before saving lol 
userSchema.pre('save',async function(){
    if(!this.isModified('password')){
        return;
    }
    const salt=await bcrypt.genSalt(10);
    this.password=await bcrypt.hash(this.password,salt);
});
userSchema.methods.matchPassword=async function(enteredPassword){
    return await bcrypt.compare(enteredPassword,this.password);
}
const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
