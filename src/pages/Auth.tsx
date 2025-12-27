import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Wrench, Mail, Lock, User, Loader2, Shield, Users, Clipboard, HelpCircle } from 'lucide-react';
import { z } from 'zod';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(2, 'Name must be at least 2 characters');

type UserRole = 'admin' | 'manager' | 'technician' | 'requester';

const roleInfo: Record<UserRole, { label: string; description: string; icon: React.ReactNode }> = {
  admin: { label: 'Admin', description: 'Create & manage organization', icon: <Shield className="h-4 w-4" /> },
  manager: { label: 'Manager', description: 'Manage work orders & team', icon: <Users className="h-4 w-4" /> },
  technician: { label: 'Technician', description: 'Execute maintenance tasks', icon: <Wrench className="h-4 w-4" /> },
  requester: { label: 'Requester', description: 'Submit maintenance requests', icon: <Clipboard className="h-4 w-4" /> },
};

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('requester');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});
  
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      // Redirect based on role
      const userRole = user.user_metadata?.role;
      if (userRole === 'admin') {
        navigate('/onboarding');
      } else {
        navigate('/join-organization');
      }
    }
  }, [user, loading, navigate]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; fullName?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    if (!isLogin) {
      const nameResult = nameSchema.safeParse(fullName);
      if (!nameResult.success) {
        newErrors.fullName = nameResult.error.errors[0].message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: 'Login failed',
            description: error.message === 'Invalid login credentials' 
              ? 'Invalid email or password. Please try again.' 
              : error.message,
            variant: 'destructive',
          });
        }
      } else {
        const { error } = await signUp(email, password, fullName, selectedRole);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Account exists',
              description: 'This email is already registered. Please log in instead.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Sign up failed',
              description: error.message,
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Account created',
            description: selectedRole === 'admin' 
              ? 'Please check your email to confirm your account, then create your organization.'
              : 'Please check your email to confirm your account, then join an organization.',
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary items-center justify-center p-12">
        <div className="max-w-md text-primary-foreground animate-fade-in">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-accent rounded-lg">
              <Wrench className="h-8 w-8 text-accent-foreground" />
            </div>
            <span className="text-3xl font-bold">GearGuard</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Maintenance Tracking Made Simple
          </h1>
          <p className="text-lg opacity-90">
            Keep your equipment running smoothly with our comprehensive maintenance management platform. 
            Track work orders, schedule preventive maintenance, and manage your team efficiently.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-6">
            <div className="p-4 bg-primary-foreground/10 rounded-lg backdrop-blur-sm">
              <div className="text-3xl font-bold">99.9%</div>
              <div className="text-sm opacity-80">Uptime Guarantee</div>
            </div>
            <div className="p-4 bg-primary-foreground/10 rounded-lg backdrop-blur-sm">
              <div className="text-3xl font-bold">50%</div>
              <div className="text-sm opacity-80">Reduce Downtime</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md shadow-medium animate-fade-in">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 lg:hidden mb-4">
              <div className="p-2 bg-primary rounded-lg">
                <Wrench className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">GearGuard</span>
            </div>
            <CardTitle className="text-2xl">
              {isLogin ? 'Welcome back' : 'Create an account'}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? 'Enter your credentials to access your dashboard' 
                : 'Get started with GearGuard today'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-sm text-destructive">{errors.fullName}</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label>Select Your Role</Label>
                    <RadioGroup
                      value={selectedRole}
                      onValueChange={(val) => setSelectedRole(val as UserRole)}
                      className="grid grid-cols-2 gap-2"
                    >
                      {(Object.keys(roleInfo) as UserRole[]).map((role) => (
                        <div key={role}>
                          <RadioGroupItem
                            value={role}
                            id={role}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={role}
                            className="flex flex-col items-center gap-1 p-3 border rounded-lg cursor-pointer hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-colors"
                          >
                            <div className="flex items-center gap-1.5 font-medium">
                              {roleInfo[role].icon}
                              {roleInfo[role].label}
                            </div>
                            <span className="text-xs text-muted-foreground text-center">
                              {roleInfo[role].description}
                            </span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isLogin ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  isLogin ? 'Sign in' : 'Create account'
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }}
                className="text-primary font-medium hover:underline"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}