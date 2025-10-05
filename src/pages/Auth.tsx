import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, LogIn, Mail, Lock, User, GraduationCap, MapPin, Calendar, Phone, ArrowLeft, KeyRound } from 'lucide-react';
import PasswordResetModal from '@/components/ui/PasswordResetModal';
import { z } from 'zod';

const signUpSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  firstName: z.string().trim().min(1, { message: "First name is required" }),
  lastName: z.string().trim().min(1, { message: "Last name is required" }),
  phone: z.string().trim().min(10, { message: "Phone number must be at least 10 digits" }),
  department: z.string().trim().min(1, { message: "Department is required" }),
  departmentOther: z.string().trim().optional(),
  year: z.number().min(1).max(5, { message: "Year must be between 1-5" }),
  yearOther: z.string().trim().optional(),
  college: z.string().trim().min(1, { message: "College name is required" }),
});

const signInSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
});

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isPasswordResetModalOpen, setIsPasswordResetModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    department: '',
    departmentOther: '',
    year: 1,
    yearOther: '',
    college: '',
  });

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    checkUser();

    // Check if we're in password reset mode
    const mode = searchParams.get('mode');
    if (mode === 'reset-password') {
      setIsForgotPassword(true);
      toast({
        title: "Password Reset Link Sent",
        description: "Please check your email for the password reset link.",
      });
    }
  }, [navigate, searchParams, toast]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const validatedData = forgotPasswordSchema.parse({ email: formData.email });

      const { error } = await supabase.auth.resetPasswordForEmail(validatedData.email, {
        redirectTo: `${window.location.origin}/auth?mode=reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Password Reset Email Sent!",
        description: "Please check your email for instructions to reset your password.",
      });

      setIsForgotPassword(false);
      setFormData(prev => ({ ...prev, email: '', password: '' }));
    } catch (error: any) {
      if (error.name === 'ZodError') {
        const firstError = error.errors[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to send password reset email",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const validatedData = signUpSchema.parse({
          ...formData,
          year: Number(formData.year),
        });

        const { error } = await supabase.auth.signUp({
          email: validatedData.email,
          password: validatedData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              first_name: validatedData.firstName,
              last_name: validatedData.lastName,
              phone: validatedData.phone,
              department: validatedData.department === 'Other' && validatedData.departmentOther ? validatedData.departmentOther : validatedData.department,
              year: validatedData.year,
              year_text: validatedData.year === 5 && validatedData.yearOther ? validatedData.yearOther : undefined,
              college: validatedData.college,
            }
          }
        });

        if (error) throw error;

        toast({
          title: "Registration Successful!",
          description: "Please check your email to verify your account.",
        });
        
        setIsSignUp(false);
      } else {
        const validatedData = signInSchema.parse(formData);

        console.log('Attempting sign in with:', validatedData.email);
        
        // Check if this is a test user (hardcoded for now)
        const testUsers = [
          { email: 'admin@vibranium.com', password: '123456', role: 'admin', name: 'Admin User' },
          { email: 'organizer@vibranium.com', password: '123456', role: 'organizer', name: 'Event Organizer' },
          { email: 'volunteer@vibranium.com', password: '123456', role: 'volunteer', name: 'Volunteer Helper' },
          { email: 'coordinator@vibranium.com', password: '123456', role: 'coordinator', name: 'Event Coordinator' },
          { email: 'staff@vibranium.com', password: '123456', role: 'staff', name: 'Staff Member' },
          { email: 'participant@vibranium.com', password: '123456', role: 'participant', name: 'Regular Participant' }
        ];

        const testUser = testUsers.find(user => 
          user.email === validatedData.email && user.password === validatedData.password
        );

        console.log('Test user check:', { testUser });

        if (testUser) {
          // This is a test user - create a real Supabase user
          console.log('Creating Supabase user for test account:', testUser.email);
          
          try {
            // First try to sign in with existing user
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: testUser.email,
              password: testUser.password,
            });

            if (!signInError && signInData.user) {
              console.log('Test user signed in successfully:', signInData.user);
              
              // Add role to user_roles table if not exists
              const { error: roleError } = await (supabase as any)
                .from('user_roles')
                .upsert({
                  user_id: signInData.user.id,
                  role: testUser.role as any
                }, {
                  onConflict: 'user_id,role'
                });

              if (roleError) {
                console.warn('Could not add role:', roleError.message);
                // Try to update the existing participant role
                const { error: updateError } = await (supabase as any)
                  .from('user_roles')
                  .update({ role: testUser.role as any })
                  .eq('user_id', signInData.user.id)
                  .eq('role', 'participant');
                
                if (updateError) {
                  console.warn('Could not update role:', updateError.message);
                }
              }

              toast({
                title: "Login Successful!",
                description: `Welcome back, ${testUser.name}!`,
              });
              
              navigate('/dashboard');
              return;
            }

            // If sign in failed, try to create the user
            console.log('Sign in failed, creating new user...');
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: testUser.email,
              password: testUser.password,
              options: {
                data: {
                  first_name: testUser.name.split(' ')[0],
                  last_name: testUser.name.split(' ').slice(1).join(' '),
                  role: testUser.role
                }
              }
            });

            if (signUpError) {
              console.error('Error creating test user:', signUpError);
              throw new Error('Failed to create test user account');
            }

            if (signUpData.user) {
              console.log('Test user created successfully:', signUpData.user);
              
              // Add role to user_roles table
              const { error: roleError } = await (supabase as any)
                .from('user_roles')
                .upsert({
                  user_id: signUpData.user.id,
                  role: testUser.role as any
                }, {
                  onConflict: 'user_id,role'
                });

              if (roleError) {
                console.warn('Could not add role:', roleError.message);
                // Try to update the existing participant role
                const { error: updateError } = await (supabase as any)
                  .from('user_roles')
                  .update({ role: testUser.role as any })
                  .eq('user_id', signUpData.user.id)
                  .eq('role', 'participant');
                
                if (updateError) {
                  console.warn('Could not update role:', updateError.message);
                }
              }

              toast({
                title: "Account Created!",
                description: `Welcome, ${testUser.name}! Your test account has been created.`,
              });
              
              navigate('/dashboard');
              return;
            }

          } catch (error) {
            console.error('Error with test user authentication:', error);
            throw new Error('Failed to authenticate test user');
          }
        }

        // If not a temp user, try Supabase Auth
        console.log('Not a temp user, trying Supabase Auth...');
        const { data, error } = await supabase.auth.signInWithPassword({
          email: validatedData.email,
          password: validatedData.password,
        });

        console.log('Supabase Auth response:', { data, error });

        if (error) throw error;

        toast({
          title: "Welcome back!",
          description: "You've been successfully logged in.",
        });
        
        navigate('/dashboard');
      }
    } catch (error: any) {
      if (error.name === 'ZodError') {
        const firstError = error.errors[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Authentication Error",
          description: error.message || "An error occurred during authentication",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'year' ? Number(value) : value
    }));
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-[94vw] sm:max-w-md mx-auto">
        <Card className="bg-gradient-card border-border shadow-lg overflow-hidden">
          <CardHeader className="text-center pb-3 sm:pb-6 px-4 sm:px-6 pt-4 sm:pt-6">
            <CardTitle className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              {isSignUp ? 'Join Vibranium' : isForgotPassword ? 'Reset Password' : 'Welcome Back'}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm md:text-base mt-1 sm:mt-2">
              {isSignUp 
                ? 'Create your account to start your techfest journey'
                : isForgotPassword 
                ? 'Enter your email address and we\'ll send you a link to reset your password'
                : 'Sign in to access your dashboard and events'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-3 sm:px-4 md:px-6 pb-4 sm:pb-6">
            <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} className="space-y-3 sm:space-y-4">
              {isSignUp && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4 min-w-0">
                    <div className="space-y-1 sm:space-y-2">
                      <Label htmlFor="firstName" className="text-xs sm:text-sm font-medium">First Name</Label>
                      <div className="relative">
                        <User className="absolute left-2 sm:left-3 top-2.5 sm:top-3 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                        <Input
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className="w-full pl-8 sm:pl-10 h-9 sm:h-10 md:h-11 text-sm sm:text-base"
                          placeholder="John"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <Label htmlFor="lastName" className="text-xs sm:text-sm font-medium">Last Name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full h-9 sm:h-10 md:h-11 text-sm sm:text-base"
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="phone" className="text-xs sm:text-sm font-medium">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-2 sm:left-3 top-2.5 sm:top-3 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full pl-8 sm:pl-10 h-9 sm:h-10 md:h-11 text-sm sm:text-base"
                        placeholder="+91 9876543210"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label className="text-xs sm:text-sm font-medium">Department</Label>
                    <div className="relative min-w-0">
                      <GraduationCap className="absolute left-2 sm:left-3 top-2.5 sm:top-3 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      <div className="pl-8 sm:pl-10 min-w-0">
                        <Select value={formData.department} onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}>
                          <SelectTrigger className="w-full h-9 sm:h-10 md:h-11 text-sm sm:text-base text-left truncate">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent className="w-[92vw] sm:w-auto max-w-[92vw] sm:max-w-none max-h-[55vh] overflow-auto">
                            <SelectItem value="Artificial Intelligence & Data Science">Artificial Intelligence & Data Science</SelectItem>
                            <SelectItem value="Computer Science Engineering in Cyber Security">Computer Science Engineering in Cyber Security</SelectItem>
                            <SelectItem value="Civil Engineering">Civil Engineering</SelectItem>
                            <SelectItem value="Electronics & Communication Engineering">Electronics & Communication Engineering</SelectItem>
                            <SelectItem value="Safety & Fire Engineering">Safety & Fire Engineering</SelectItem>
                            <SelectItem value="Computer Science & Engineering">Computer Science & Engineering</SelectItem>
                            <SelectItem value="Computer Science & Business Systems">Computer Science & Business Systems</SelectItem>
                            <SelectItem value="Mechanical Engineering">Mechanical Engineering</SelectItem>
                            <SelectItem value="Science & Humanities">Science & Humanities</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        {formData.department === 'Other' && (
                          <Input
                            name="departmentOther"
                            value={formData.departmentOther}
                            onChange={handleInputChange}
                            className="mt-2 w-full h-9 sm:h-10 md:h-11 text-sm sm:text-base"
                            placeholder="Type your department"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                    <div className="space-y-1 sm:space-y-2 min-w-0">
                      <Label className="text-xs sm:text-sm font-medium">Year</Label>
                      <div className="relative min-w-0">
                        <Calendar className="absolute left-2 sm:left-3 top-2.5 sm:top-3 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                        <div className="pl-8 sm:pl-10 min-w-0">
                          <Select value={String(formData.year)} onValueChange={(value) => setFormData(prev => ({ ...prev, year: Number(value) }))}>
                            <SelectTrigger className="w-full h-9 sm:h-10 md:h-11 text-sm sm:text-base text-left">
                              <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                            <SelectContent className="w-[60vw] sm:w-auto max-w-[90vw] max-h-[55vh] overflow-auto">
                              <SelectItem value="1">1st Year</SelectItem>
                              <SelectItem value="2">2nd Year</SelectItem>
                              <SelectItem value="3">3rd Year</SelectItem>
                              <SelectItem value="4">4th Year</SelectItem>
                              <SelectItem value="5">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          {formData.year === 5 && (
                            <Input
                              name="yearOther"
                              value={formData.yearOther}
                              onChange={handleInputChange}
                              className="mt-2 w-full h-9 sm:h-10 md:h-11 text-sm sm:text-base"
                              placeholder="Type your year"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1 sm:space-y-2 min-w-0">
                      <Label htmlFor="college" className="text-xs sm:text-sm font-medium">College</Label>
                      <div className="relative min-w-0">
                        <GraduationCap className="absolute left-2 sm:left-3 top-2.5 sm:top-3 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                        <Input
                          id="college"
                          name="college"
                          value={formData.college}
                          onChange={handleInputChange}
                          className="w-full pl-8 sm:pl-10 h-9 sm:h-10 md:h-11 text-sm sm:text-base"
                          placeholder="ABC College"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="email" className="text-xs sm:text-sm font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-2 sm:left-3 top-2.5 sm:top-3 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="pl-8 sm:pl-10 h-9 sm:h-10 md:h-11 text-sm sm:text-base"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              {!isForgotPassword && (
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="password" className="text-xs sm:text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-2 sm:left-3 top-2.5 sm:top-3 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="pl-8 sm:pl-10 h-9 sm:h-10 md:h-11 text-sm sm:text-base"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-10 sm:h-11 md:h-12 text-sm sm:text-base font-medium mt-4 sm:mt-6"
                variant="hero"
                disabled={isLoading}
              >
                {isLoading ? (
                  "Processing..."
                ) : isSignUp ? (
                  <>
                    <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Create Account
                  </>
                ) : isForgotPassword ? (
                  <>
                    <KeyRound className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Send Reset Link
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="mt-3 sm:mt-4 md:mt-6 text-center space-y-2 sm:space-y-3">
              {!isForgotPassword && (
                <>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                  </p>
                  <Button
                    variant="link"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-primary hover:text-primary-glow text-sm sm:text-base font-medium p-1 sm:p-2"
                  >
                    {isSignUp ? 'Sign In' : 'Create Account'}
                  </Button>
                </>
              )}
              
              {!isSignUp && !isForgotPassword && (
                <div className="pt-1 sm:pt-2">
                  <Button
                    variant="link"
                    onClick={() => setIsPasswordResetModalOpen(true)}
                    className="text-xs sm:text-sm text-muted-foreground hover:text-primary p-1 sm:p-2"
                  >
                    Forgot your password?
                  </Button>
                </div>
              )}

              {isForgotPassword && (
                <div className="pt-1 sm:pt-2">
                  <Button
                    variant="link"
                    onClick={() => setIsForgotPassword(false)}
                    className="text-xs sm:text-sm text-muted-foreground hover:text-primary flex items-center p-1 sm:p-2"
                  >
                    <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    Back to Sign In
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-3 sm:mt-4 text-center">
              <Link to="/events">
                <Button variant="ghost" size="sm" className="text-xs sm:text-sm p-2 sm:p-3">
                  ← Back to Events
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        <PasswordResetModal 
          isOpen={isPasswordResetModalOpen}
          onClose={() => setIsPasswordResetModalOpen(false)}
          email={formData.email}
        />
      </div>
    </div>
  );
};

export default Auth;